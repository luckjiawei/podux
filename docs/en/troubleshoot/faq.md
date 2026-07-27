# FAQ

## Basics & Installation

### Q: What is Podux? How is it different from plain frpc?

A: Podux is a graphical management tool built on top of frpc. It integrates the core frp client functionality and provides a modern web interface for managing configuration, monitoring status, and viewing logs — eliminating the need to manually edit config files and the lack of visual monitoring in vanilla frpc.

### Q: Which operating systems does Podux support?

A: Windows, macOS, and major Linux distributions are all supported.

## Configuration & Usage

### Q: Can I import my existing `frpc.toml` config file?

A: It is currently recommended to recreate your configuration through Podux's visual interface to ensure all fields are correctly parsed and managed.

### Q: How do configuration changes take effect?

A: Podux supports hot reload. After saving changes in the web UI, the application automatically applies the new configuration — a full service restart is usually not required.

### Q: Which proxy protocols are supported?

A: **TCP**, **UDP**, **HTTP**, **HTTPS**, and **XTCP** are supported. XTCP includes both provider proxies and independently managed visitors. STCP and SUDP are not yet available.

### Q: What is required for XTCP?

A: The provider and visitor must connect to the same frps endpoint and both networks must allow outbound UDP traffic. XTCP relies on NAT traversal and may fail when either side is behind a restrictive or symmetric NAT. Podux supports QUIC and KCP XTCP tunnels, but does not currently provide an automatic STCP fallback.

## Troubleshooting

### Q: How do I report a bug or unknown error?

A: Please open an issue on the GitHub repository. Include detailed error logs, steps to reproduce, and your operating system information to help us diagnose the problem quickly.
