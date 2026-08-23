import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { serializeUser, type SerializedUser, type SerializedAddress } from "../common/user.serializer";
import type { AddressDto, UpdateProfileDto } from "./users.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<SerializedUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { addresses: { orderBy: [{ isDefaultShipping: "desc" }, { createdAt: "asc" }] } },
    });
    return serializeUser(user, user.addresses.map(serializeAddress));
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<SerializedUser> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      },
    });
    return this.getProfile(userId);
  }

  // --- Address book ---------------------------------------------------------

  async listAddresses(userId: string): Promise<SerializedAddress[]> {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefaultShipping: "desc" }, { createdAt: "asc" }],
    });
    return addresses.map(serializeAddress);
  }

  async createAddress(userId: string, dto: AddressDto): Promise<SerializedAddress> {
    const address = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefaultShipping) {
        await tx.address.updateMany({ where: { userId }, data: { isDefaultShipping: false } });
      }
      const count = await tx.address.count({ where: { userId } });
      return tx.address.create({
        data: {
          userId,
          label: dto.label,
          line1: dto.line1.trim(),
          line2: dto.line2?.trim(),
          city: dto.city.trim(),
          state: dto.state.toUpperCase().trim(),
          zip: dto.zip.trim(),
          country: (dto.country ?? "US").toUpperCase(),
          // First address added becomes the default automatically.
          isDefaultShipping: dto.isDefaultShipping ?? count === 0,
        },
      });
    });
    return serializeAddress(address);
  }

  async updateAddress(userId: string, addressId: string, dto: AddressDto): Promise<SerializedAddress> {
    await this.assertOwnership(userId, addressId);
    const address = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefaultShipping) {
        await tx.address.updateMany({ where: { userId }, data: { isDefaultShipping: false } });
      }
      return tx.address.update({
        where: { id: addressId },
        data: {
          label: dto.label,
          line1: dto.line1.trim(),
          line2: dto.line2?.trim(),
          city: dto.city.trim(),
          state: dto.state.toUpperCase().trim(),
          zip: dto.zip.trim(),
          country: (dto.country ?? "US").toUpperCase(),
          ...(dto.isDefaultShipping !== undefined ? { isDefaultShipping: dto.isDefaultShipping } : {}),
        },
      });
    });
    return serializeAddress(address);
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    await this.assertOwnership(userId, addressId);
    await this.prisma.address.delete({ where: { id: addressId } });
  }

  private async assertOwnership(userId: string, addressId: string): Promise<void> {
    if (!addressId) throw new BadRequestException("Address id is required.");
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!address || address.userId !== userId) {
      throw new NotFoundException("Address not found.");
    }
  }
}

function serializeAddress(a: {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
}): SerializedAddress {
  return {
    id: a.id,
    label: a.label,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    state: a.state,
    zip: a.zip,
    country: a.country,
  };
}
