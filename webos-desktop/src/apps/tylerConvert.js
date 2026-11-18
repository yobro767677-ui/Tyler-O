import { openFileConverter } from "../utils/fileConverter.js";

import { BaseApp, os } from "../framework.js";
export class TylerConvertApp extends BaseApp {
  singletonWindowIds = ["tyler-convert"];

  constructor(services) {
    super(services);
  }

  async open() {
    const win = os.window.create(
      "tyler-convert",
      "Tyler Convert",
      "540px",
      "420px",
      {
        icon: "fas fa-exchange-alt",
      },
    );
    win.innerHTML = `<div class="window-content tyler-convert-landing">

        <div id="tyler-convert-main-view" class="tyler-convert-landing-view">
          <div class="tyler-convert-icon-box">
            <i class="fas fa-exchange-alt"></i>
          </div>
          <h2 class="tyler-convert-landing-title">Tyler Convert</h2>
          <p class="tyler-convert-landing-desc">
            Easily batch convert images, audio, video, structured data, and documents directly in your browser without any server uploads.
          </p>
          
          <div class="tyler-convert-btn-row">
            <button id="tyler-convert-btn-local" class="tyler-convert-btn-primary">
              <i class="fas fa-laptop"></i> From Device
            </button>
            <button id="tyler-convert-btn-tyler" class="tyler-convert-btn-secondary">
              <i class="fas fa-folder-open"></i> Browse Tyler OS
            </button>
          </div>
        </div>

        <div id="tyler-convert-loading-view" class="tyler-convert-loading-view">
          <i class="fas fa-spinner fa-spin"></i>
          <div class="tyler-convert-loading-text">Importing files to virtual filesystem...</div>
        </div>

        <input type="file" id="tyler-convert-file-input" class="tyler-convert-file-input" multiple>
      </div>`;

    const mainView = win.querySelector("#tyler-convert-main-view");
    const loadingView = win.querySelector("#tyler-convert-loading-view");
    const fileInput = win.querySelector("#tyler-convert-file-input");
    const btnLocal = win.querySelector("#tyler-convert-btn-local");
    const btnTyler = win.querySelector("#tyler-convert-btn-tyler");

    btnLocal.addEventListener("click", (e) => {
      e.stopPropagation();
      fileInput.click();
    });

    btnTyler.addEventListener("click", (e) => {
      e.stopPropagation();
      const closeBtn = win.querySelector(".close-btn");
      if (closeBtn) closeBtn.click();
      os.app.launch("explorerApp");
    });

    fileInput.addEventListener("change", async (e) => {
      const files = Array.from(fileInput.files);
      if (files.length === 0) return;

      if (mainView) mainView.style.display = "none";
      if (loadingView) loadingView.style.display = "flex";

      const path = ["Downloads"];
      const fileNames = [];

      try {
        const exists = await os.fs.exists(path);
        if (!exists) {
          await os.fs.mkdir(path);
        } else {
          const isFile = await os.fs.isFile(path);
          if (isFile) {
            await os.fs.delete(path);
            await os.fs.mkdir(path);
          }
        }
      } catch (e) {
        await os.fs.mkdir(path);
      }

      for (const file of files) {
        await os.fs.writeBinaryFile(path, file.name, file);
        fileNames.push(file.name);
      }

      const closeBtn = win.querySelector(".close-btn");
      if (closeBtn) closeBtn.click();

      for (const fileName of fileNames) {
        openFileConverter(fileName, path, this.os);
      }
    });
  }
}
