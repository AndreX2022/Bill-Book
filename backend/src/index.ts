import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { businessRouter } from "./routes/business";
import { customersRouter } from "./routes/customers";
import { itemsRouter } from "./routes/items";
import { invoicesRouter } from "./routes/invoices";
import { reportsRouter } from "./routes/reports";
import { errorHandler } from "./middleware/errorHandler";
import { requireAuth } from "./middleware/requireAuth";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);

app.use("/api/business", requireAuth, businessRouter);
app.use("/api/customers", requireAuth, customersRouter);
app.use("/api/items", requireAuth, itemsRouter);
app.use("/api/invoices", requireAuth, invoicesRouter);
app.use("/api/reports", requireAuth, reportsRouter);

app.use(errorHandler);

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Billbook API running on http://localhost:${port}`);
});
