"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const platform_express_1 = require("@nestjs/platform-express");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_express_1.ExpressAdapter());
    await app.listen(3000);
    console.log(`Control Plane is running on: ${await app.getUrl()}`);
}
bootstrap();
//# sourceMappingURL=main.js.map