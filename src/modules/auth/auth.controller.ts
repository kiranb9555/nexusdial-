import { Request, Response } from 'express';
import * as authService from './auth.service';
import { SendOtpInput, VerifyOtpInput, RefreshInput } from './auth.schemas';

export async function sendOtp(req: Request, res: Response): Promise<void> {
  const { mobile } = req.body as SendOtpInput;
  const result = await authService.sendOtp(mobile);
  res.status(200).json({ message: 'OTP sent', ...result });
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { mobile, otp, businessName } = req.body as VerifyOtpInput;
  const { tenant, tokens } = await authService.verifyOtp(mobile, otp, businessName);
  res.status(200).json({
    tenant: { id: tenant.id, businessName: tenant.businessName, planTier: tenant.planTier },
    ...tokens,
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as RefreshInput;
  const tokens = await authService.refresh(refreshToken);
  res.status(200).json(tokens);
}
