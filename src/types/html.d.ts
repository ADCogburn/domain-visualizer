// esbuild's `text` loader turns the built view into a string at bundle time.
declare module '*.html' {
  const html: string;
  export default html;
}
