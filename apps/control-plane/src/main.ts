import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter());
  // Control Plane must run on Port 3000 as per Constitution
  await app.listen(3000);
  console.log(`Control Plane is running on: ${await app.getUrl()}`);
}
bootstrap();
