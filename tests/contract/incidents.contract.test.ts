import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../apps/api/src/app';
import { incidentStore } from '../../apps/api/src/store/incidentStore';

describe('API Contract Tests - /api/incidents', () => {
  beforeEach(async () => {
    await incidentStore.clear();
  });

  describe('GET /api/health', () => {
    it('returns status 200 ok and health metadata', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'rescue-link-api');
    });
  });

  describe('POST /api/incidents', () => {
    it('creates an incident when valid SOS payload is provided (201 Created)', async () => {
      const validPayload = {
        category: 'flood',
        description: 'Water level rising quickly in living room',
        location: {
          lat: 37.7749,
          lng: -122.4194,
          label: 'San Francisco, CA',
        },
        peopleAffected: 3,
        urgentNeeds: ['boat', 'medical'],
        reporter: {
          contactMethod: 'phone',
          contactValue: '+15550199',
        },
      };

      const response = await request(app)
        .post('/api/incidents')
        .send(validPayload);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(typeof response.body.id).toBe('string');
      expect(response.body.status).toBe('new');
      expect(response.body.priority).toBe('pending_triage');
      expect(response.body.location.lat).toBe(37.7749);
      expect(response.body.location.lng).toBe(-122.4194);
      expect(response.body.details.category).toBe('flood');
      expect(response.body.details.peopleAffected).toBe(3);
      expect(response.body.details.urgentNeeds).toEqual(['boat', 'medical']);
    });

    it('returns 400 Bad Request when description is missing', async () => {
      const invalidPayload = {
        category: 'flood',
        location: { lat: 37.7749, lng: -122.4194 },
      };

      const response = await request(app)
        .post('/api/incidents')
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
    });

    it('returns 400 Bad Request when coordinates are invalid', async () => {
      const invalidPayload = {
        category: 'fire',
        description: 'House fire',
        location: { lat: 100, lng: -122.4194 }, // lat > 90 invalid
      };

      const response = await request(app)
        .post('/api/incidents')
        .send(invalidPayload);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/incidents', () => {
    it('returns empty array initially', async () => {
      const response = await request(app).get('/api/incidents');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('returns newly created incidents', async () => {
      await request(app).post('/api/incidents').send({
        category: 'fire',
        description: 'Electrical fire in garage',
        location: { lat: 40.7128, lng: -74.006 },
        peopleAffected: 2,
        urgentNeeds: [],
      });

      const response = await request(app).get('/api/incidents');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].details.category).toBe('fire');
    });
  });

  describe('GET /api/incidents/:id', () => {
    it('fetches a single created incident by ID', async () => {
      const postRes = await request(app).post('/api/incidents').send({
        category: 'landslide',
        description: 'Mud blocking highway',
        location: { lat: 34.0522, lng: -118.2437 },
        peopleAffected: 1,
        urgentNeeds: [],
      });

      const incidentId = postRes.body.id;
      const getRes = await request(app).get(`/api/incidents/${incidentId}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.id).toBe(incidentId);
      expect(getRes.body.details.category).toBe('landslide');
    });

    it('returns 404 for non-existent incident ID', async () => {
      const getRes = await request(app).get('/api/incidents/non-existent-uuid');

      expect(getRes.status).toBe(404);
      expect(getRes.body).toHaveProperty('error', 'Incident not found');
    });
  });

  describe('POST /api/incidents/:id/acknowledge', () => {
    it('updates incident status to acknowledged', async () => {
      const postRes = await request(app).post('/api/incidents').send({
        category: 'flood',
        description: 'Stranded in vehicle',
        location: { lat: 29.7604, lng: -95.3698 },
        peopleAffected: 1,
        urgentNeeds: ['boat'],
      });

      const incidentId = postRes.body.id;
      const ackRes = await request(app)
        .post(`/api/incidents/${incidentId}/acknowledge`)
        .send({ assignedTo: 'responder-unit-42' });

      expect(ackRes.status).toBe(200);
      expect(ackRes.body.status).toBe('acknowledged');
      expect(ackRes.body.assignedTo).toBe('responder-unit-42');
    });
  });

  describe('POST /api/incidents/:id/broadcast', () => {
    it('sends tactical directive broadcast to survivor/zone', async () => {
      const postRes = await request(app).post('/api/incidents').send({
        category: 'flood',
        description: 'Trapped on balcony',
        location: { lat: 37.77, lng: -122.41 },
        peopleAffected: 2,
        urgentNeeds: ['medical'],
      });

      const incidentId = postRes.body.id;
      const bcastRes = await request(app)
        .post(`/api/incidents/${incidentId}/broadcast`)
        .send({
          message: 'EVACUATE TO ROOF IMMEDIATELY',
          channel: 'wifi',
          target: 'zone',
        });

      expect(bcastRes.status).toBe(200);
      expect(bcastRes.body.success).toBe(true);
      expect(bcastRes.body.incident.triage.suggestedAction).toBe('EVACUATE TO ROOF IMMEDIATELY');
    });
  });

  describe('GET /api/sensors and /api/hazard-zones', () => {
    it('returns environmental sensor telemetry list', async () => {
      const res = await request(app).get('/api/sensors');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('type');
      expect(res.body[0]).toHaveProperty('percentOfThreshold');
    });

    it('returns disaster hazard zones list', async () => {
      const res = await request(app).get('/api/hazard-zones');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('radiusMeters');
    });
  });
});
