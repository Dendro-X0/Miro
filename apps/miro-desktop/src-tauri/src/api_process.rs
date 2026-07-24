use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Manager, RunEvent};

pub struct ApiProcessState {
    child: Mutex<Option<Child>>,
}

fn workspace_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.."))
}

fn should_spawn_api() -> bool {
    match std::env::var("MIRO_DESKTOP_SPAWN_API") {
        Ok(value) => {
            let normalized = value.trim().to_lowercase();
            !(normalized == "0" || normalized == "false" || normalized == "no" || normalized == "off")
        }
        // Default on — desktop should work without a second terminal.
        Err(_) => true,
    }
}

fn node_command() -> Command {
    Command::new("node")
}

fn api_is_ready() -> bool {
    std::net::TcpStream::connect_timeout(
        &"127.0.0.1:8787".parse().expect("valid localhost address"),
        Duration::from_millis(200),
    )
    .is_ok()
}

fn spawn_with_node(script: &Path, cwd: Option<&Path>) -> Result<Child, std::io::Error> {
    let mut command = node_command();
    command.arg(script);
    if let Some(dir) = cwd {
        command.current_dir(dir);
    }
    command
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .stdin(Stdio::null())
        .spawn()
}

fn bundled_sidecar_path(app: &AppHandle) -> Option<PathBuf> {
    let resource = app.path().resource_dir().ok()?;
    let candidate = resource.join("miro-api").join("index.mjs");
    if candidate.exists() {
        return Some(candidate);
    }
    None
}

fn dev_sidecar_path() -> Option<PathBuf> {
    let candidate = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join("miro-api")
        .join("index.mjs");
    if candidate.exists() {
        return Some(candidate);
    }
    None
}

fn try_spawn_strategies(app: &AppHandle) -> Option<Child> {
    if let Some(path) = bundled_sidecar_path(app) {
        match spawn_with_node(&path, None) {
            Ok(child) => {
                eprintln!("[miro-desktop] spawned bundled API sidecar at {}", path.display());
                return Some(child);
            }
            Err(err) => eprintln!("[miro-desktop] bundled sidecar spawn failed: {err}"),
        }
    }

    if let Some(path) = dev_sidecar_path() {
        match spawn_with_node(&path, None) {
            Ok(child) => {
                eprintln!("[miro-desktop] spawned dev API sidecar at {}", path.display());
                return Some(child);
            }
            Err(err) => eprintln!("[miro-desktop] dev sidecar spawn failed: {err}"),
        }
    }

    let root = workspace_root();
    let pnpm = Command::new("pnpm")
        .args(["--filter", "@miro/api", "dev"])
        .current_dir(&root)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .stdin(Stdio::null())
        .spawn();
    if let Ok(child) = pnpm {
        eprintln!(
            "[miro-desktop] spawned @miro/api via pnpm from {}",
            root.display()
        );
        return Some(child);
    }

    let tsx_cli = root.join("node_modules").join("tsx").join("dist").join("cli.mjs");
    let api_run = root.join("apps").join("miro-api").join("src").join("run.ts");
    if tsx_cli.exists() && api_run.exists() {
        let mut command = node_command();
        command
            .arg(&tsx_cli)
            .arg(&api_run)
            .current_dir(&root)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .stdin(Stdio::null());
        if let Ok(child) = command.spawn() {
            eprintln!("[miro-desktop] spawned @miro/api via node + tsx");
            return Some(child);
        }
    }

    None
}

fn wait_for_api_ready() {
    for attempt in 0..40 {
        if api_is_ready() {
            eprintln!("[miro-desktop] API ready on :8787");
            return;
        }
        if attempt == 0 {
            eprintln!("[miro-desktop] waiting for API on :8787...");
        }
        thread::sleep(Duration::from_millis(250));
    }
    eprintln!("[miro-desktop] API did not respond on :8787 within 10s");
}

pub fn spawn_api_process(app: &AppHandle) {
    if !should_spawn_api() {
        eprintln!("[miro-desktop] API spawn disabled (MIRO_DESKTOP_SPAWN_API=0)");
        app.manage(ApiProcessState {
            child: Mutex::new(None),
        });
        return;
    }

    match try_spawn_strategies(app) {
        Some(child) => {
            app.manage(ApiProcessState {
                child: Mutex::new(Some(child)),
            });
            wait_for_api_ready();
        }
        None => {
            eprintln!(
                "[miro-desktop] failed to spawn @miro/api. Install Node.js 20+ on PATH (required for the bundled sidecar), or run: pnpm --filter @miro/api dev. See docs/sidecar-strategy.md"
            );
            app.manage(ApiProcessState {
                child: Mutex::new(None),
            });
        }
    }
}

pub fn kill_api_process(app: &AppHandle) {
    if let Some(state) = app.try_state::<ApiProcessState>() {
        if let Ok(mut guard) = state.child.lock() {
            if let Some(mut child) = guard.take() {
                let _ = child.kill();
                let _ = child.wait();
                eprintln!("[miro-desktop] stopped @miro/api child process");
            }
        }
    }
}

pub fn handle_run_event(app: &AppHandle, event: &RunEvent) {
    if matches!(event, RunEvent::Exit | RunEvent::ExitRequested { .. }) {
        kill_api_process(app);
    }
}
