import bcrypt from 'bcrypt';
import prisma from '../db/index.js';
import { AppError } from '../utils/AppError.js';
import { signToken } from '../utils/token.js';
import { logger } from '../utils/logger.js';

export async function loginUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      teacher: true,
      guardian: true,
    },
  });

  if (!user) {
    logger.warn(`Failed login attempt for non-existent email: ${normalizedEmail}`);
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    logger.warn(`Failed login attempt (wrong password) for user id: ${user.id}`);
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const token = signToken({
    id: user.id,
    role: user.role,
  });

  // Log authentication event in immutable audit log (never expose password or token)
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      meta: JSON.stringify({
        email: user.email,
        role: user.role,
      }),
    },
  });

  logger.info(`User authenticated successfully: id=${user.id}, role=${user.role}`);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      teacher: user.teacher,
      guardian: user.guardian,
    },
  };
}

export async function getUserProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      teacher: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      guardian: {
        select: {
          id: true,
          name: true,
          phone: true,
          guardianStudents: {
            select: {
              relationship: true,
              student: {
                select: {
                  id: true,
                  name: true,
                  rollNumber: true,
                  section: {
                    select: {
                      id: true,
                      name: true,
                      class: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User profile not found.');
  }

  return user;
}
