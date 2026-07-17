import assert from 'node:assert/strict';
import test from 'node:test';

import { ContactService } from '../src/contact/contact-service.js';
import { mapLeadForCrm } from '../src/integrations/crm/lead-mapper.js';
import { MockLeadProvider } from '../src/providers/lead-provider.js';
import { InMemoryLeadRepository } from '../src/repositories/lead-repository.js';

const context = { requestId: 'request-13', correlationId: 'correlation-13' };

test('lead intelligence survives endpoint normalization and CRM mapping', () => {
  const service = new ContactService({
    provider: new MockLeadProvider(),
    repository: new InMemoryLeadRepository(),
  });
  const lead = service.normalize(
    {
      name: 'Casey Morgan',
      email: 'casey@example.com',
      message: 'Help me plan a relocation.',
      leadIntent: 'Request professional guidance',
      leadScore: 58,
      leadScoreBand: 'High',
      leadScoreReasons: [
        { id: 'assessment-complete', label: 'Completed an assessment', points: 25 },
      ],
      leadContext: {
        schemaVersion: '1.0',
        decisionJourney: 'relocation',
        primaryGoal: 'Plan a move',
        landingPage: '/life-decisions/relocation/',
        referralSource: 'google',
        pagesViewed: 5,
        contentViewed: ['decision-relocation', 'columbus'],
        assessmentCompleted: true,
        guidesDownloaded: ['relocation-guide'],
        platformVersion: '1.5.0',
      },
      journeyTimeline: [
        {
          event: 'landing',
          path: '/life-decisions/relocation/',
          occurredAt: '2026-07-16T12:00:00Z',
        },
        { event: 'assessment_completed', path: '/decision/', occurredAt: '2026-07-16T12:05:00Z' },
      ],
    },
    { context },
  );

  assert.equal(lead.leadContext.decisionJourney, 'relocation');
  assert.equal(lead.journeyTimeline.length, 2);
  assert.equal(lead.leadScoreBand, 'High');
  const canonical = mapLeadForCrm(lead);
  assert.equal(canonical.decisionJourney, 'relocation');
  assert.deepEqual(canonical.assessments, ['housing-decision-assessment']);
  const boldTrail = mapLeadForCrm(lead, 'boldtrail');
  assert.equal(boldTrail.source, 'HomesByRCG');
  assert.match(boldTrail.notes, /assessment_completed/);
});

test('lead intelligence validation rejects oversized timelines', () => {
  const service = new ContactService({
    provider: new MockLeadProvider(),
    repository: new InMemoryLeadRepository(),
  });
  assert.throws(
    () =>
      service.normalize(
        {
          name: 'Casey Morgan',
          email: 'casey@example.com',
          message: 'Please contact me.',
          leadIntent: 'Request professional guidance',
          journeyTimeline: Array.from({ length: 51 }, (_, index) => ({
            event: 'page_view',
            index,
          })),
        },
        { context },
      ),
    /validation failed/u,
  );
});
