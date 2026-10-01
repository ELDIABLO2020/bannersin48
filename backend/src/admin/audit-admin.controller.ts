import { Controller, Get, Query } from "@nestjs/common";
import { RequirePermissions } from "../rbac/require-permissions.decorator";
import { AuditAdminService } from "./audit-admin.service";
import { AuditQueryDto } from "./audit-admin.dto";

/** Audit log viewer API (`audit:read`, elevated). */
@Controller("admin/audit")
@RequirePermissions("audit:read")
export class AuditAdminController {
  constructor(private readonly audit: AuditAdminService) {}

  @Get()
  list(@Query() query: AuditQueryDto) {
    return this.audit.list(query);
  }

  @Get("actions")
  actions() {
    return this.audit.actions();
  }
}
