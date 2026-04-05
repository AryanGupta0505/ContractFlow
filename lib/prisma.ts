import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

function isClientCompatible(client: ReturnType<typeof prismaClientSingleton>) {
  return (
    typeof client === "object" &&
    client !== null &&
    "template" in client &&
    "auditLog" in client &&
    "workflow" in client
  )
}

const prisma =
  globalThis.prisma && isClientCompatible(globalThis.prisma)
    ? globalThis.prisma
    : prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
