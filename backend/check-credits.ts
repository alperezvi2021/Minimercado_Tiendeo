import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { SalesService } from './src/sales/sales.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const salesService = app.get(SalesService);
  const tenantsService = app.get('TenantsService'); // I need to find the actual name
  
  // Just log all credits
  const credits = await salesService.findAllPendingCredits('1'); // Test with tenant 1
  console.log('Credits for Tenant 1:', credits);
  
  await app.close();
}
bootstrap();
