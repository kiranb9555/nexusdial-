import request from 'supertest';
import { createApp } from '../../app';
import { authenticate } from '../../test/helpers';

const app = createApp();
const MOBILE = '+919811112222';

describe('Auth flow (OTP)', () => {
  it('sends an OTP and verifies it to return tokens', async () => {
    const sendRes = await request(app).post('/api/auth/send-otp').send({ mobile: MOBILE });
    expect(sendRes.status).toBe(200);
    expect(sendRes.body.devOtp).toMatch(/^\d{6}$/);

    const verifyRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ mobile: MOBILE, otp: sendRes.body.devOtp });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.accessToken).toBeDefined();
    expect(verifyRes.body.refreshToken).toBeDefined();
    expect(verifyRes.body.tenant.id).toBeDefined();
  });

  it('rejects an invalid OTP with ND_4003', async () => {
    await request(app).post('/api/auth/send-otp').send({ mobile: MOBILE });
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ mobile: MOBILE, otp: '000000' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('ND_4003');
  });

  it('rejects malformed body with validation error ND_4001', async () => {
    const res = await request(app).post('/api/auth/send-otp').send({ mobile: 'not-a-phone' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ND_4001');
  });

  it('strips unknown fields from the request body', async () => {
    const res = await request(app)
      .post('/api/auth/send-otp')
      .send({ mobile: MOBILE, isAdmin: true });
    expect(res.status).toBe(200);
  });

  it('rate limits OTP requests to 3 per window (ND_4291)', async () => {
    await request(app).post('/api/auth/send-otp').send({ mobile: MOBILE });
    await request(app).post('/api/auth/send-otp').send({ mobile: MOBILE });
    await request(app).post('/api/auth/send-otp').send({ mobile: MOBILE });
    const res = await request(app).post('/api/auth/send-otp').send({ mobile: MOBILE });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('ND_4291');
  });

  it('rotates the refresh token and issues a new access token', async () => {
    const auth = await authenticate(app, MOBILE);
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: auth.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();

    // The old refresh token is now revoked.
    const reuse = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: auth.refreshToken });
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe('ND_4013');
  });

  it('blocks protected routes without a token (ND_4010)', async () => {
    const res = await request(app).get('/api/numbers');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('ND_4010');
  });
});
