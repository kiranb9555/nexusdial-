import request from 'supertest';
import { createApp } from '../../app';
import { authenticate, seedPool, bearer } from '../../test/helpers';

const app = createApp();

async function provisionNumber(token: string): Promise<string> {
  const res = await request(app)
    .post('/api/numbers')
    .set('Authorization', bearer(token))
    .send({});
  return res.body.id as string;
}

describe('Call simulation + contacts + analytics', () => {
  it('creates an ANSWERED call and resolves a contact', async () => {
    await seedPool(2);
    const auth = await authenticate(app, '+919700000001');
    const numberId = await provisionNumber(auth.accessToken);

    const res = await request(app)
      .post('/api/simulate/call')
      .set('Authorization', bearer(auth.accessToken))
      .send({
        virtualNumberId: numberId,
        callerMobile: '+919812345678',
        direction: 'INBOUND',
        durationSec: 42,
        hasVoicemail: false,
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('ANSWERED');
    expect(res.body.contactId).toBeTruthy();

    const contacts = await request(app)
      .get('/api/contacts')
      .set('Authorization', bearer(auth.accessToken));
    expect(contacts.body.total).toBe(1);
    expect(contacts.body.data[0].callCount).toBe(1);
  });

  it('marks a zero-duration call as MISSED', async () => {
    await seedPool(2);
    const auth = await authenticate(app, '+919700000002');
    const numberId = await provisionNumber(auth.accessToken);

    const res = await request(app)
      .post('/api/simulate/call')
      .set('Authorization', bearer(auth.accessToken))
      .send({
        virtualNumberId: numberId,
        callerMobile: '+919812345000',
        direction: 'INBOUND',
        durationSec: 0,
        hasVoicemail: false,
      });
    expect(res.body.status).toBe('MISSED');
  });

  it('supports contact timeline, patch tags, and soft delete', async () => {
    await seedPool(2);
    const auth = await authenticate(app, '+919700000003');
    const numberId = await provisionNumber(auth.accessToken);
    await request(app)
      .post('/api/simulate/call')
      .set('Authorization', bearer(auth.accessToken))
      .send({
        virtualNumberId: numberId,
        callerMobile: '+919812345111',
        direction: 'INBOUND',
        durationSec: 30,
        hasVoicemail: false,
      });

    const list = await request(app)
      .get('/api/contacts')
      .set('Authorization', bearer(auth.accessToken));
    const contactId = list.body.data[0].id as string;

    const patched = await request(app)
      .patch(`/api/contacts/${contactId}`)
      .set('Authorization', bearer(auth.accessToken))
      .send({ name: 'Ramesh', addTags: ['vip'] });
    expect(patched.body.name).toBe('Ramesh');
    expect(patched.body.tags).toContain('vip');

    const timeline = await request(app)
      .get(`/api/contacts/${contactId}/timeline`)
      .set('Authorization', bearer(auth.accessToken));
    expect(timeline.body.data).toHaveLength(1);

    const del = await request(app)
      .delete(`/api/contacts/${contactId}`)
      .set('Authorization', bearer(auth.accessToken));
    expect(del.status).toBe(200);

    const afterDelete = await request(app)
      .get('/api/contacts')
      .set('Authorization', bearer(auth.accessToken));
    expect(afterDelete.body.total).toBe(0);
  });

  it('returns analytics scoped to the tenant', async () => {
    await seedPool(2);
    const auth = await authenticate(app, '+919700000004');
    const numberId = await provisionNumber(auth.accessToken);
    await request(app)
      .post('/api/simulate/call')
      .set('Authorization', bearer(auth.accessToken))
      .send({
        virtualNumberId: numberId,
        callerMobile: '+919812300000',
        direction: 'INBOUND',
        durationSec: 0,
        hasVoicemail: false,
      });

    const res = await request(app)
      .get('/api/analytics/summary')
      .set('Authorization', bearer(auth.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.totalCallsToday).toBe(1);
    expect(res.body.missedCallsToday).toBe(1);
    expect(res.body.sentimentBreakdown).toEqual({ positive: 0, neutral: 0, negative: 0 });
  });

  it('enforces tenant isolation: B cannot simulate on A virtual number', async () => {
    await seedPool(5);
    const a = await authenticate(app, '+919700000005');
    const b = await authenticate(app, '+919700000006');
    const numberId = await provisionNumber(a.accessToken);

    const res = await request(app)
      .post('/api/simulate/call')
      .set('Authorization', bearer(b.accessToken))
      .send({
        virtualNumberId: numberId,
        callerMobile: '+919812399999',
        direction: 'INBOUND',
        durationSec: 10,
        hasVoicemail: false,
      });
    expect(res.status).toBe(404);
  });

  it('isolates contacts between tenants', async () => {
    await seedPool(5);
    const a = await authenticate(app, '+919700000007');
    const b = await authenticate(app, '+919700000008');
    const aNumber = await provisionNumber(a.accessToken);
    await request(app)
      .post('/api/simulate/call')
      .set('Authorization', bearer(a.accessToken))
      .send({
        virtualNumberId: aNumber,
        callerMobile: '+919812388888',
        direction: 'INBOUND',
        durationSec: 20,
        hasVoicemail: false,
      });

    const bContacts = await request(app)
      .get('/api/contacts')
      .set('Authorization', bearer(b.accessToken));
    expect(bContacts.body.total).toBe(0);
  });
});
