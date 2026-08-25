# Part 4 — Ubuntu 裡的開發工具（15 分鐘）

> 來源：[《本地 RAG 系統實戰》環境安裝手冊](https://rag-setup-manual.vercel.app/#part-4--ubuntu-%E8%A3%A1%E7%9A%84%E9%96%8B%E7%99%BC%E5%B7%A5%E5%85%B715-%E5%88%86%E9%90%98)

以下全部在 Ubuntu 裡執行。

## 4-1. 系統套件

Ubuntu（WSL）：

```bash
sudo apt update && sudo apt install -y build-essential curl git make unzip python3-venv python3-dev pipx
```

（會問你剛才設定的 Linux 密碼。）

## 4-2. Poetry 2.3.0（Python 套件管理）

本專案把 Poetry 版本鎖在 **2.3.0**（見 repo 的 `version/poetry`），照裝這一版：

Ubuntu（WSL）：

```bash
pipx ensurepath
```

```bash
exec $SHELL
```

```bash
pipx install poetry==2.3.0
```

## 4-3. Node 22.12 + Yarn（前端工具鏈）

用 nvm 安裝專案指定的 Node 版本（見 `frontend/.nvmrc`）：

Ubuntu（WSL）：

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

```bash
exec $SHELL
```

```bash
nvm install 22.12.0 && nvm alias default 22.12.0
```

```bash
npm install -g yarn
```

## ✅ 檢查點 4 — 五連發版本檢查

- [ ] 這關過了

Ubuntu（WSL）：

```bash
python3 --version && poetry --version && node --version && yarn --version && docker --version
```

預期輸出（版本號小數點後不同沒關係）：

```text
Python 3.12.x
Poetry (version 2.3.0)
v22.12.0
1.22.x
Docker version 2x.x.x
```

哪一行少了就回去重做對應小節。
