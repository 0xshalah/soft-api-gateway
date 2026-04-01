import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter());
  
  // Enable CORS so the web dashboard (Vercel) can communicate with the Control Plane
  app.enableCors({
    origin: '*', // You can restrict this to your specific vercel domain if you want
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  // Control Plane must run on Port 3000 as per Constitution
  await app.listen(3000);
  console.log(`Control Plane is running on: ${await app.getUrl()}`);
}
bootstrap();
