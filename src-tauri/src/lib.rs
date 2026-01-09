use std::fs;
use std::path::PathBuf;
use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
    children: Option<Vec<FileEntry>>,
}

#[tauri::command]
fn read_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let path = PathBuf::from(&path);
    read_dir_recursive(&path, 0, 3)
}

fn read_dir_recursive(path: &PathBuf, depth: u32, max_depth: u32) -> Result<Vec<FileEntry>, String> {
    if depth > max_depth {
        return Ok(vec![]);
    }

    let mut entries = vec![];

    let dir = fs::read_dir(path).map_err(|e| e.to_string())?;

    for entry in dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files and .obsidian folder
        if file_name.starts_with('.') {
            continue;
        }

        let file_path = entry.path();
        let is_dir = file_path.is_dir();

        // Only include .md files and directories
        if !is_dir && !file_name.ends_with(".md") {
            continue;
        }

        let children = if is_dir {
            Some(read_dir_recursive(&file_path, depth + 1, max_depth).unwrap_or_default())
        } else {
            None
        };

        entries.push(FileEntry {
            name: file_name,
            path: file_path.to_string_lossy().to_string(),
            is_dir,
            children,
        });
    }

    // Sort: folders first, then alphabetically
    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![read_directory, read_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
