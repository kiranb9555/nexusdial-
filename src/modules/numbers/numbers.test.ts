import request from 'supertest';
import { createApp } from '../../app';
import { authenticate, seedPool, bearer } from '../../test/helpers';

const app = createApp();

describe('Virtual number management', () => {
  it('provisions a number from the pool and lists it', async () => {
    await seedPool(3);
    const auth = await authenticate(app, '+919800000001');

    const provision = await request(app)
      .post('/api/numbers')
      .set('Authorization', bearer(auth.accessToken))
      .send({ label: 'Sales line' });
    expect(provision.status).toBe(201);
    expect(provision.body.e164Number).toMatch(/^\+91/);
    expect(provision.body.label).toBe('Sales line');

    const list = await request(app)
      .get('/api/numbers')
      .set('Authorization', bearer(auth.accessToken));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
  });

  it('returns ND_4091 when the pool is empty', async () => {
    const auth = await authenticate(app, '+919800000002');
    const res = await request(app)
      .post('/api/numbers')
      .set('Authorization', bearer(auth.accessToken))
      .send({});
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ND_4091');
  });

  it('updates label and isActive', async () => {
    await seedPool(2);
    const auth = await authenticate(app, '+919800000003');
    const provision = await request(app)
      .post('/api/numbers')
      .set('Authorization', bearer(auth.accessToken))
      .send({});

    const patch = await request(app)
      .patch(`/api/numbers/${provision.body.id}`)
      .set('Authorization', bearer(auth.accessToken))
      .send({ label: 'Support', isActive: false });
    expect(patch.status).toBe(200);
    expect(patch.body.label).toBe('Support');
    expect(patch.body.isActive).toBe(false);
  });

  it('enforces tenant isolation: tenant B cannot patch tenant A number', async () => {
    await seedPool(5);
    const a = await authenticate(app, '+919800000004');
    const b = await authenticate(app, '+919800000005');

    const provision = await request(app)
      .post('/api/numbers')
      .set('Authorization', bearer(a.accessToken))
      .send({});

    const res = await request(app)
      .patch(`/api/numbers/${provision.body.id}`)
      .set('Authorization', bearer(b.accessToken))
      .send({ label: 'hijack' });
    expect(res.status).toBe(404);
  });
});
