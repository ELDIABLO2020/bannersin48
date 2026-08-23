import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { AuthedUser } from "../common/jwt-auth.guard";
import { OrdersService } from "./orders.service";
import type { OrderDetail, OrderListItem } from "./orders.service";
import { CreateOrderDto } from "./orders.dto";

@Controller("orders")
@UseGuards(JwtAuthGuard) // no guest checkout (§7)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(@CurrentUser() user: AuthedUser, @Body() dto: CreateOrderDto, @Req() req: Request): Promise<OrderDetail> {
    const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip;
    return this.orders.create(user.id, dto, ip);
  }

  @Get()
  listMine(@CurrentUser() user: AuthedUser): Promise<OrderListItem[]> {
    return this.orders.listMine(user.id);
  }

  @Get(":id")
  getDetail(@CurrentUser() user: AuthedUser, @Param("id") id: string): Promise<OrderDetail> {
    return this.orders.getMineDetail(user.id, id);
  }

  @Post(":id/cancel")
  cancel(@CurrentUser() user: AuthedUser, @Param("id") id: string): Promise<OrderDetail> {
    return this.orders.cancel(user.id, id);
  }
}
