FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# System packages:
# - docker.io + fuse-overlayfs: run the local Supabase stack inside the Cloud
#   Agent VM. fuse-overlayfs is required because the VM root filesystem is
#   itself an overlay mount, so the native overlay2 driver cannot mount there.
# - iptables (nft + legacy): Docker bridge networking / firewall rules.
# - postgresql-client: apply supabase/schema.sql and health-check the DB.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates curl git sudo gnupg lsb-release \
      docker.io fuse-overlayfs uidmap iptables \
      postgresql-client build-essential \
 && rm -rf /var/lib/apt/lists/*

# Node.js 22 (matches the repo toolchain).
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*

# Supabase CLI (pinned).
ARG SUPABASE_CLI_VERSION=2.117.0
RUN curl -fsSL -o /tmp/supabase.deb \
      "https://github.com/supabase/cli/releases/download/v${SUPABASE_CLI_VERSION}/supabase_${SUPABASE_CLI_VERSION}_linux_amd64.deb" \
 && dpkg -i /tmp/supabase.deb \
 && rm -f /tmp/supabase.deb

# The ubuntu:24.04 image already ships a non-root "ubuntu" user (uid 1000).
# Give it passwordless sudo and docker access.
RUN (getent group docker || groupadd docker) \
 && (id -u ubuntu >/dev/null 2>&1 || useradd -m -s /bin/bash ubuntu) \
 && usermod -aG sudo,docker ubuntu \
 && echo 'ubuntu ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/90-ubuntu \
 && chmod 0440 /etc/sudoers.d/90-ubuntu

USER ubuntu
WORKDIR /workspace
