# TEAM

## Suggested split

The 32 GB laptop runs the mobile stack: Metro, Gradle, Appium, and the phone cable.
The backend laptop runs Docker Compose: postgres, redis, and backend, which is roughly 500 MB.
The third laptop runs tests, docs, and the CI watch: pytest, k6, optional Selenium, ADR.md, and TRACEABILITY.md.

## GitHub

The team lead's repo should add all three developers as collaborators with write access, plus `nascon-eval-26`.
Everyone needs a working SSH key or PAT.

## SSH over port 443

If campus blocks port 22, add this to `~/.ssh/config`:

```sshconfig
Host github.com
  HostName ssh.github.com
  Port 443
  User git
```

Test with `ssh -T git@github.com`, and accept the host key once beforehand so scripts never block on a prompt.

## Git

Set the default branch once:

```bash
git config --global init.defaultBranch main
```

Use `scripts/push.sh` hourly, or have everyone use it. It rebases first, so avoid force-pushing or rewriting pushed history. Day 2 continues from the locked Day 1 SHA.

## Hotspot

One phone can host the hotspot if needed; the team should agree on who owns it.
Use `hostname -I` on each laptop to discover the local address.
From the phone browser, test `http://<ip>:3000/health` before the final cutover.

## Network assumptions

Do not rely on Tailscale; it is not on the campus allowlist.
The Docker image is the source of truth for Node, so commit `package-lock.json`.
