const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({
  outputDir:'test-results-app',testDir:'./tests',testMatch:'**/app-flow.spec.cjs',workers:1,timeout:60000,
  use:{baseURL:'http://127.0.0.1:8083',channel:process.env.PLAYWRIGHT_CHANNEL||undefined,headless:true,screenshot:'only-on-failure',trace:'retain-on-failure'},
  webServer:{command:'node ../LaundryApp/scripts/preview-export.cjs',url:'http://127.0.0.1:8083',reuseExistingServer:!process.env.CI,timeout:30000},
});
