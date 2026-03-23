import { DataSource } from 'typeorm';
import { Sale } from './src/sales/entities/sale.entity';
import { CreditSale } from './src/sales/entities/credit-sale.entity';
import { Customer } from './src/customers/entities/customer.entity';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_DATABASE || "tiendeo",
    entities: [Sale, CreditSale, Customer],
    synchronize: false,
});

async function check() {
    await AppDataSource.initialize();
    const creditSales = await AppDataSource.getRepository(CreditSale).find();
    console.log("CREDIT SALES:", JSON.stringify(creditSales, null, 2));
    
    const customers = await AppDataSource.getRepository(Customer).find();
    console.log("CUSTOMERS:", JSON.stringify(customers, null, 2));
    
    await AppDataSource.destroy();
}

check();
