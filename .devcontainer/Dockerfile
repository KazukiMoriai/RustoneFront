FROM node:16

# Python とFFmpegのインストール
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    git \
    curl \
    ffmpeg \
    libavcodec-dev \
    libavformat-dev \
    libavdevice-dev \
    libavutil-dev \
    libavfilter-dev \
    libswscale-dev \
    libswresample-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Solidity 開発ツールのインストール
RUN npm install -g truffle ganache-cli solc

# 作業ディレクトリの設定
WORKDIR /workspace

# Python 仮想環境のセットアップ
RUN python3 -m venv /workspace/venv
ENV PATH="/workspace/venv/bin:$PATH"

# Node.jsのグローバルパッケージ
RUN npm install -g create-react-app typescript

# ユーザー設定
USER node

# anomalibのインストール
RUN pip install -r requirements.txt