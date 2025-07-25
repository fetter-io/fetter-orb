use std::env;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

fn load_env_from_file(path: &str) {
    if let Ok(file) = File::open(path) {
        let reader = BufReader::new(file);
        for line_result in reader.lines() {
            if let Ok(line) = line_result {
                let line = line.trim();
                if line.is_empty() || line.starts_with('#') {
                    continue;
                }
                if let Some((key, value)) = line.split_once('=') {
                    let key = key.trim();
                    let value = value.trim().trim_matches('"');
                    env::set_var(key, value);
                }
            }
        }
    }
}

pub fn load_env() {
    // let env_mode = env::var("APP_ENV").unwrap_or_else(|_| "development".to_string());

    let candidates = [
        ".env",
        ".env.local",
        // &format!(".env.{}.local", env_mode),
    ];

    for file in candidates {
        if Path::new(file).exists() {
            println!("loading: {:?}", file);
            load_env_from_file(file);
        }
    }
}
