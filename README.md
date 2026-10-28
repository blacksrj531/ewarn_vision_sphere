# 🌐 eWARN Vision Sphere Studio
> Advanced Open-Vocabulary Zero-Shot Object Detection & Counting Interface.

Built with **React 19**, **TypeScript**, **Tailwind CSS**, and **Hugging Face Transformers.js / ONNX Runtime Web**.

### ✨ Highlights
- **100% Free & Client-Side**: No API keys, no server costs. Everything evaluates directly inside visitor browsers via WebAssembly & WebGPU.
- **Open-Vocabulary Detection**: Detect anything by typing arbitrary natural language class names.
- **Enterprise UI/UX**: Compact, high-density dashboard inspired by modern developer tooling with 3 switchable design themes (Midnight Pro, Executive Studio Light, Obsidian Slate).
- **Multi-Input**: Drag-and-drop, native clipboard screenshot paste (`Ctrl + V`), and live device camera stream with rear/front lens switching.
- **Author Attribution**: Made with precision by **BLACKSRJ531**.

---

## 🚀 How to Publish to GitHub & GitHub Pages

### 1. Initialize Git & Push to your GitHub Repository
Open PowerShell or your terminal in this folder and run:
```powershell
git init
git add .
git commit -m "feat: complete eWARN Vision Sphere Studio release"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME.git
git push -u origin main
```

### 2. Deploy to Live GitHub Pages (1-Click)
Run:
```powershell
npm run deploy
```
This automatically compiles the optimized production bundle and pushes it to the `gh-pages` branch. Your website will be live at:
`https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPOSITORY_NAME/`
