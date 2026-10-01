import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "changeme123";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 10) },
  });

  const business = await prisma.business.upsert({
    where: { id: "demo-business" },
    update: {},
    create: {
      id: "demo-business",
      name: "Your Business Name",
      gstin: "19AAAAA0000A1Z5",
      address: "Edit this via PUT /api/business",
      state: "West Bengal",
      phone: "9999999999",
      email: "billing@example.com",
      invoicePrefix: "INV",
    },
  });

  const customerA = await prisma.customer.upsert({
    where: { id: "demo-customer-a" },
    update: {},
    create: {
      id: "demo-customer-a",
      name: "Sample Retail Pvt Ltd",
      gstin: "19BBBBB0000B1Z5",
      email: "accounts@sampleretail.example",
      phone: "9800000000",
      address: "Kolkata, West Bengal",
      state: "West Bengal", // same state as business -> CGST+SGST on invoices
    },
  });

  await prisma.customer.upsert({
    where: { id: "demo-customer-b" },
    update: {},
    create: {
      id: "demo-customer-b",
      name: "Northline Traders",
      email: "accounts@northline.example",
      phone: "9811111111",
      address: "New Delhi",
      state: "Delhi", // different state -> IGST on invoices
    },
  });

  await prisma.item.upsert({
    where: { id: "demo-item-1" },
    update: {},
    create: {
      id: "demo-item-1",
      name: "Consulting Service - Hourly",
      hsnCode: "998313",
      unit: "hrs",
      salePrice: 2000,
      gstRate: 18,
      stockQty: 0,
      lowStockAt: 0,
    },
  });

  await prisma.item.upsert({
    where: { id: "demo-item-2" },
    update: {},
    create: {
      id: "demo-item-2",
      name: "USB Security Key",
      hsnCode: "847130",
      unit: "pcs",
      salePrice: 1500,
      purchasePrice: 950,
      gstRate: 18,
      stockQty: 25,
      lowStockAt: 5,
    },
  });

  console.log("Seed complete:", { business: business.name, customer: customerA.name, adminLogin: adminEmail });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
