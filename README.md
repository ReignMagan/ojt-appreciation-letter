# A Letter of Appreciation

A personal OJT thank-you letter to the Planning and Development Office. A midnight backdrop, softly lit CSS envelope, and gentle opening animation lead into a warm paper letter. Plain HTML, CSS, and JavaScript; no installation or build step.

## Make it yours

Edit the letter directly in `index.html`. It includes the supplied personal messages to Ma'am Cristina, Ma'am Kyleen, Sir Jayped, Ma'am Cristyflor, Sir Charlie, Sir Moscoso, and Sir Jarvis, along with the original humor and trainee sign-off. The wording is preserved with a light grammar correction. No name placeholders remain; you can add your own name to the signature if you wish.

Treat the published page as publicly accessible and include only details you are comfortable sharing.

## Preview

Open `index.html` in a browser and select **Break the seal**. The site also works on any static web server. Refresh to return to the closed envelope. With JavaScript disabled, the letter appears immediately. Reduced-motion preferences skip the animations.

## Publish on GitHub Pages

1. Create a GitHub repository and upload `index.html`, `style.css`, and `script.js` to the root of its `main` branch.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select **main** and **/ (root)**, then **Save**.
5. Wait for deployment and open the website link shown in Pages settings, usually `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.

All asset links are relative, so repository subpaths work. No custom domain or workflow is needed. See [GitHub's publishing instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Browser check

With Node.js 22+ and Google Chrome installed, run:

```sh
node tests/browser-check.mjs
```

The check uses Chrome's browser automation interface without npm dependencies. On systems where Chrome is installed elsewhere, set `CHROME_PATH` to its executable. The default path is the standard Windows Chrome location.

It checks mouse, touch, Enter and Space activation; heading focus; repeated activation; widths of 320, 390, and 1440 pixels; reduced motion; JavaScript-disabled reading; and asset loading under a repository subpath. It starts a temporary local server and removes its temporary browser profile afterward.
