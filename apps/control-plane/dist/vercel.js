"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const core_1 = require("@nestjs/core");
const platform_express_1 = require("@nestjs/platform-express");
const app_module_1 = require("./app.module");
const express_1 = require("express");
const serverless_express_1 = require("@vendia/serverless-express");
let cachedServer;
const bootstrap = async () => {
    if (!cachedServer) {
        const expressApp = (0, express_1.default)();
        const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_express_1.ExpressAdapter(expressApp));
        app.enableCors();
        await app.init();
        cachedServer = (0, serverless_express_1.configure)({ app: expressApp });
    }
    return cachedServer;
};
const handler = async (event, context, callback) => {
    const server = await bootstrap();
    return server(event, context, callback);
};
exports.handler = handler;
//# sourceMappingURL=vercel.js.map