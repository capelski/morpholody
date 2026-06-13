import react from '@vitejs/plugin-react';
import { defineConfig, UserConfig } from 'vite';

const config: UserConfig = {
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
};

const { IS_GITHUB_PAGES_BUILD } = process.env;
if (IS_GITHUB_PAGES_BUILD) {
  config.base = '/morpholody/';
  config.build = config.build || {};
  config.build.outDir = 'docs';
}

export default defineConfig(config);
