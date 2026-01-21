use log::{info, debug, error, LevelFilter};
use serde::Serialize;
use std::collections::HashMap;
use std::env;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use notify::{RecommendedWatcher, RecursiveMode, Watcher, Event, EventKind};

/// Initialize logging based on build profile
fn init_logging() {
    let is_dev = cfg!(debug_assertions);

    let mut builder = env_logger::Builder::new();

    if is_dev {
        // Dev mode: verbose logging to stderr
        builder.filter_level(LevelFilter::Debug);
        builder.format(|buf, record| {
            writeln!(
                buf,
                "[{}] {} - {}:{} - {}",
                record.level(),
                record.target(),
                record.file().unwrap_or("unknown"),
                record.line().unwrap_or(0),
                record.args()
            )
        });
    } else {
        // Prod mode: only warnings and errors
        builder.filter_level(LevelFilter::Warn);
        builder.format(|buf, record| {
            writeln!(buf, "[{}] {}", record.level(), record.args())
        });
    }

    // Allow RUST_LOG env var to override
    builder.parse_env("RUST_LOG");
    builder.init();

    info!("Logging initialized (dev={})", is_dev);
}

/// State for managing file watchers - allows proper cleanup
pub struct WatcherState {
    watchers: Arc<Mutex<HashMap<String, RecommendedWatcher>>>,
}

impl WatcherState {
    pub fn new() -> Self {
        Self {
            watchers: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl Default for WatcherState {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Serialize, Clone)]
pub struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
    size: u64,
    modified: u64,
    children: Option<Vec<FileEntry>>,
}

#[derive(Serialize, Clone)]
pub struct FileMetadata {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_file: bool,
    pub size: u64,
    pub modified: u64,
    pub exists: bool,
}

#[tauri::command]
fn read_directory(
    path: String,
    recursive: Option<bool>,
    max_depth: Option<u32>,
) -> Result<Vec<FileEntry>, String> {
    let path = PathBuf::from(&path);
    let recursive = recursive.unwrap_or(true);
    if recursive {
        read_dir_recursive(&path, 0, max_depth.unwrap_or(u32::MAX))
    } else {
        read_dir_shallow(&path)
    }
}

fn read_dir_shallow(path: &PathBuf) -> Result<Vec<FileEntry>, String> {
    let mut entries = vec![];
    let dir = fs::read_dir(path).map_err(|e| e.to_string())?;

    for entry in dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_name = entry.file_name().to_string_lossy().to_string();
        let file_path = entry.path();
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        let is_dir = metadata.is_dir();

        let size = metadata.len();
        let modified = metadata
            .modified()
            .map(|t| {
                t.duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs()
            })
            .unwrap_or(0);

        entries.push(FileEntry {
            name: file_name,
            path: file_path.to_string_lossy().to_string(),
            is_dir,
            size,
            modified,
            children: None,
        });
    }

    // Sort: folders first, then alphabetically
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

fn read_dir_recursive(
    path: &PathBuf,
    depth: u32,
    max_depth: u32,
) -> Result<Vec<FileEntry>, String> {
    if depth > max_depth {
        return Ok(vec![]);
    }

    let mut entries = vec![];

    let dir = fs::read_dir(path).map_err(|e| e.to_string())?;

    for entry in dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_name = entry.file_name().to_string_lossy().to_string();

        let file_path = entry.path();
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        let is_dir = metadata.is_dir();

        let size = metadata.len();
        let modified = metadata
            .modified()
            .map(|t| {
                t.duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs()
            })
            .unwrap_or(0);

        let children = if is_dir {
            Some(read_dir_recursive(&file_path, depth + 1, max_depth).unwrap_or_default())
        } else {
            None
        };

        entries.push(FileEntry {
            name: file_name,
            path: file_path.to_string_lossy().to_string(),
            is_dir,
            size,
            modified,
            children,
        });
    }

    // Sort: folders first, then alphabetically
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn file_exists(path: String) -> bool {
    std::path::Path::new(&path).exists()
}

#[tauri::command]
fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(&old_path, &new_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    if PathBuf::from(&path).is_dir() {
        fs::remove_dir_all(&path).map_err(|e| e.to_string())
    } else {
        fs::remove_file(&path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn move_file(source: String, destination: String) -> Result<(), String> {
    fs::rename(&source, &destination).map_err(|e| e.to_string())
}

/// Get file metadata without reading content
#[tauri::command]
fn stat_path(path: String) -> Result<FileMetadata, String> {
    let path_obj = PathBuf::from(&path);
    let metadata = fs::metadata(&path_obj);

    let name = path_obj
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "".to_string());

    match metadata {
        Ok(meta) => {
            let modified = meta
                .modified()
                .map(|t| {
                    t.duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs()
                })
                .unwrap_or(0);

            Ok(FileMetadata {
                name,
                path,
                is_dir: meta.is_dir(),
                is_file: meta.is_file(),
                size: meta.len(),
                modified,
                exists: true,
            })
        }
        Err(_) => Ok(FileMetadata {
            name,
            path,
            is_dir: false,
            is_file: false,
            size: 0,
            modified: 0,
            exists: false,
        }),
    }
}

/// Read binary file (for images, etc.)
#[tauri::command]
fn read_file_binary(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| e.to_string())
}

/// Write binary file (for images, etc.)
#[tauri::command]
fn write_file_binary(path: String, data: Vec<u8>) -> Result<(), String> {
    fs::write(&path, data).map_err(|e| e.to_string())
}

/// Watch a directory for changes and emit events to the frontend
/// This is more efficient than polling and provides real-time updates
#[tauri::command]
fn watch_directory(
    path: String,
    app: AppHandle,
    watcher_state: State<'_, WatcherState>,
) -> Result<(), String> {
    let path_obj = PathBuf::from(&path);

    if !path_obj.exists() || !path_obj.is_dir() {
        return Err(format!("Path does not exist or is not a directory: {}", path));
    }

    // Check if we're already watching this path
    {
        let watchers = watcher_state.watchers.lock().map_err(|e| e.to_string())?;
        if watchers.contains_key(&path) {
            // Already watching, no-op
            return Ok(());
        }
    }

    let path_for_emit = path.clone();
    let path_for_key = path.clone();

    // Create a watcher with debouncing to avoid excessive events
    let mut watcher: RecommendedWatcher = Watcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                // Filter for relevant events (create, modify, remove, rename)
                match event.kind {
                    EventKind::Create(_) |
                    EventKind::Modify(_) |
                    EventKind::Remove(_) |
                    EventKind::Any => {
                        // Emit the path that changed
                        let _ = app.emit("fs-change", path_for_emit.clone());
                    }
                    _ => {}
                }
            }
        },
        notify::Config::default()
            .with_poll_interval(Duration::from_secs(1))
            .with_compare_contents(true),
    ).map_err(|e| e.to_string())?;

    // Watch the directory recursively
    watcher.watch(&path_obj, RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    // Store the watcher in state so it stays alive and can be cleaned up
    let mut watchers = watcher_state.watchers.lock().map_err(|e| e.to_string())?;
    watchers.insert(path_for_key, watcher);

    Ok(())
}

/// Stop watching a directory
#[tauri::command]
fn unwatch_directory(
    path: String,
    watcher_state: State<'_, WatcherState>,
) -> Result<(), String> {
    let mut watchers = watcher_state.watchers.lock().map_err(|e| e.to_string())?;

    // Remove the watcher - it will be dropped and stop watching
    if watchers.remove(&path).is_some() {
        Ok(())
    } else {
        // Not an error if we weren't watching - idempotent
        Ok(())
    }
}

/// Stop all watchers (useful for cleanup)
#[tauri::command]
fn unwatch_all(watcher_state: State<'_, WatcherState>) -> Result<(), String> {
    let mut watchers = watcher_state.watchers.lock().map_err(|e| e.to_string())?;
    watchers.clear();
    Ok(())
}

#[tauri::command]
fn get_app_data_dir(app: AppHandle) -> String {
    // Get the app's data directory for storing settings, vault registry, etc.
    app.path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| ".".to_string())
}

/// Get the default vault path (~/Documents/Igne)
#[tauri::command]
fn get_default_vault_path() -> Result<String, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let vault_path = home.join("Documents").join("Igne");
    Ok(vault_path.to_string_lossy().to_string())
}

/// Ensure the default vault exists, creating it if necessary
/// Returns the vault path
#[tauri::command]
fn ensure_default_vault() -> Result<String, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let vault_path = home.join("Documents").join("Igne");

    // Create vault directory if it doesn't exist
    if !vault_path.exists() {
        fs::create_dir_all(&vault_path).map_err(|e| e.to_string())?;

        // Create .obsidian directory
        let obsidian_path = vault_path.join(".obsidian");
        fs::create_dir_all(&obsidian_path).map_err(|e| e.to_string())?;

        // Create app.json
        let app_config = r#"{
  "alwaysUpdateLinks": true,
  "newFileLocation": "root",
  "attachmentFolderPath": "attachments",
  "showLineNumber": true,
  "strictLineBreaks": false,
  "vimMode": false
}"#;
        fs::write(obsidian_path.join("app.json"), app_config).map_err(|e| e.to_string())?;

        // Create appearance.json
        let appearance_config = r##"{
  "baseFontSize": 16,
  "baseTheme": "dark",
  "accentColor": "#a78bfa",
  "translucency": false
}"##;
        fs::write(obsidian_path.join("appearance.json"), appearance_config).map_err(|e| e.to_string())?;

        // Create Welcome.md
        let welcome_content = r#"# Welcome to Igne

Igne is a fast, native markdown editor with Obsidian vault compatibility.

## Quick Start

- **Cmd+N** - Create a new note
- **Cmd+P** - Quick switcher to find notes
- **Cmd+S** - Save current note
- **Cmd+,** - Open settings

## Features

- [[Wikilinks]] to connect your notes
- Live preview as you type
- Backlinks panel to see connections
- Graph view of your knowledge
- Obsidian theme and plugin compatibility

## Get Started

Start writing! Create your first note with **Cmd+N** or edit this one.

---

*This is your default vault. You can open other vaults anytime from the vault switcher.*
"#;
        fs::write(vault_path.join("Welcome.md"), welcome_content).map_err(|e| e.to_string())?;
    }

    Ok(vault_path.to_string_lossy().to_string())
}

/// Check if a path is a markdown file
fn is_markdown_file(path: &str) -> bool {
    let lower = path.to_lowercase();
    lower.ends_with(".md") || lower.ends_with(".markdown") || lower.ends_with(".mdx")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    debug!("GlobalShortcut handler: shortcut={:?}, state={:?}", shortcut, event.state());
                    if event.state() == ShortcutState::Pressed {
                        info!("Global shortcut Cmd+Option+N pressed - bringing window to focus");
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                        let _ = app.emit("global-quick-capture", ());
                    }
                })
                .build(),
        )
        .manage(WatcherState::new())
        .menu(|app| {
            // macOS App menu (with About, Hide, Quit)
            #[cfg(target_os = "macos")]
            let app_menu = Submenu::with_items(
                app,
                "Igne",
                true,
                &[
                    &PredefinedMenuItem::about(app, Some("About Igne"), None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::services(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::hide(app, None)?,
                    &PredefinedMenuItem::hide_others(app, None)?,
                    &PredefinedMenuItem::show_all(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::quit(app, None)?,
                ],
            )?;

            // File menu
            let new_file = MenuItem::with_id(app, "new_file", "New File", true, Some("CmdOrCtrl+N"))?;
            let open_file = MenuItem::with_id(app, "open_file", "Open File...", true, Some("CmdOrCtrl+O"))?;
            let save_file = MenuItem::with_id(app, "save_file", "Save", true, Some("CmdOrCtrl+S"))?;
            let close_tab = MenuItem::with_id(app, "close_tab", "Close Tab", true, Some("CmdOrCtrl+W"))?;

            let file_menu = Submenu::with_items(
                app,
                "File",
                true,
                &[
                    &new_file,
                    &open_file,
                    &PredefinedMenuItem::separator(app)?,
                    &save_file,
                    &PredefinedMenuItem::separator(app)?,
                    &close_tab,
                ],
            )?;

            // Edit menu with standard items
            let edit_menu = Submenu::with_items(
                app,
                "Edit",
                true,
                &[
                    &PredefinedMenuItem::undo(app, None)?,
                    &PredefinedMenuItem::redo(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::cut(app, None)?,
                    &PredefinedMenuItem::copy(app, None)?,
                    &PredefinedMenuItem::paste(app, None)?,
                    &PredefinedMenuItem::select_all(app, None)?,
                ],
            )?;

            // View menu
            let quick_switcher = MenuItem::with_id(app, "quick_switcher", "Quick Switcher", true, Some("CmdOrCtrl+P"))?;
            let settings = MenuItem::with_id(app, "settings", "Settings...", true, Some("CmdOrCtrl+,"))?;

            let view_menu = Submenu::with_items(
                app,
                "View",
                true,
                &[
                    &quick_switcher,
                    &PredefinedMenuItem::separator(app)?,
                    &settings,
                ],
            )?;

            // Window menu
            let window_menu = Submenu::with_items(
                app,
                "Window",
                true,
                &[
                    &PredefinedMenuItem::minimize(app, None)?,
                    &PredefinedMenuItem::maximize(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::close_window(app, None)?,
                ],
            )?;

            #[cfg(target_os = "macos")]
            return Menu::with_items(app, &[&app_menu, &file_menu, &edit_menu, &view_menu, &window_menu]);

            #[cfg(not(target_os = "macos"))]
            Menu::with_items(app, &[&file_menu, &edit_menu, &view_menu, &window_menu])
        })
        .on_menu_event(|app, event| {
            let event_id = event.id().as_ref();
            match event_id {
                "new_file" => {
                    let _ = app.emit("menu-new-file", ());
                }
                "open_file" => {
                    let _ = app.emit("menu-open-file", ());
                }
                "save_file" => {
                    let _ = app.emit("menu-save-file", ());
                }
                "close_tab" => {
                    let _ = app.emit("menu-close-tab", ());
                }
                "quick_switcher" => {
                    let _ = app.emit("menu-quick-switcher", ());
                }
                "settings" => {
                    let _ = app.emit("menu-settings", ());
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            read_directory,
            read_file,
            write_file,
            file_exists,
            stat_path,
            read_file_binary,
            write_file_binary,
            rename_file,
            delete_file,
            create_directory,
            move_file,
            watch_directory,
            unwatch_directory,
            unwatch_all,
            get_app_data_dir,
            get_default_vault_path,
            ensure_default_vault
        ])
        .setup(|app| {
            // Initialize logging first
            init_logging();
            info!("Igne app starting...");

            // Global shortcut: Cmd+Option+N (⌘+⌥+N) for quick capture
            #[cfg(desktop)]
            {
                let shortcut = Shortcut::new(
                    Some(Modifiers::SUPER | Modifiers::ALT),
                    Code::KeyN
                );
                debug!("Registering global shortcut Cmd+Option+N...");
                match app.global_shortcut().register(shortcut) {
                    Ok(_) => info!("Global shortcut Cmd+Option+N registered successfully"),
                    Err(e) => error!("Failed to register global shortcut: {}", e),
                }
            }

            // Check CLI arguments for a file path
            let args: Vec<String> = env::args().collect();

            // Skip the first arg (program name) and look for a file path
            // Also skip any Tauri-specific args that start with --
            for arg in args.iter().skip(1) {
                if arg.starts_with("--") || arg.starts_with("-") {
                    continue;
                }

                // Check if this looks like a file path
                let path = PathBuf::from(arg);
                if path.exists() && path.is_file() && is_markdown_file(arg) {
                    let absolute_path = path.canonicalize()
                        .unwrap_or(path)
                        .to_string_lossy()
                        .to_string();

                    // Emit event to frontend after a short delay to ensure it's ready
                    let app_handle = app.handle().clone();
                    std::thread::spawn(move || {
                        // Wait for frontend to initialize
                        std::thread::sleep(Duration::from_millis(500));
                        let _ = app_handle.emit("open-standalone-file", absolute_path);
                    });
                    break;
                }
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, _event| {
            // Handle files opened while app is already running
            // Note: On macOS, file association events come through RunEvent::Opened
            // On Linux, file associations are handled via CLI args at startup
            #[cfg(target_os = "macos")]
            {
                if let tauri::RunEvent::Opened { urls } = _event {
                    for url in urls {
                        if let Ok(path) = url.to_file_path() {
                            let path_str = path.to_string_lossy().to_string();
                            if is_markdown_file(&path_str) {
                                let _ = _app.emit("open-standalone-file", path_str);
                            }
                        }
                    }
                }
            }
        });
}
