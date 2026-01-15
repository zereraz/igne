use serde::Serialize;
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State};
use notify::{RecommendedWatcher, RecursiveMode, Watcher, Event, EventKind};

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
        .manage(WatcherState::new())
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
            get_app_data_dir
        ])
        .setup(|app| {
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
        .run(|app, event| {
            // Handle files opened while app is already running (e.g., double-click on macOS)
            if let tauri::RunEvent::Opened { urls } = event {
                for url in urls {
                    // Convert URL to file path
                    if let Ok(path) = url.to_file_path() {
                        let path_str = path.to_string_lossy().to_string();
                        if is_markdown_file(&path_str) {
                            let _ = app.emit("open-standalone-file", path_str);
                        }
                    }
                }
            }
        });
}
