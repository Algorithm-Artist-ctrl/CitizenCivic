import uuid
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from areas.models import Category, ServiceArea
from cases.models import Case, CaseStatus, CaseTransition, Feedback, HotspotCheck
from core.models import AuditLog


class CaseWorkflowTestCase(TestCase):
    def setUp(self):
        # Users
        self.citizen = User.objects.create_user(
            username='citizen_test@example.com',
            email='citizen_test@example.com',
            password='Password123!',
            display_name='Test Citizen',
            role=User.Role.CITIZEN,
        )
        self.other_citizen = User.objects.create_user(
            username='other_citizen@example.com',
            email='other_citizen@example.com',
            password='Password123!',
            display_name='Other Citizen',
            role=User.Role.CITIZEN,
        )
        self.moderator = User.objects.create_user(
            username='mod_test@example.com',
            email='mod_test@example.com',
            password='Password123!',
            display_name='Test Moderator',
            role=User.Role.MODERATOR,
        )
        self.operator = User.objects.create_user(
            username='op_test@example.com',
            email='op_test@example.com',
            password='Password123!',
            display_name='Test Operator',
            role=User.Role.OPERATOR,
        )
        self.supervisor = User.objects.create_user(
            username='sup_test@example.com',
            email='sup_test@example.com',
            password='Password123!',
            display_name='Test Supervisor',
            role=User.Role.SUPERVISOR,
        )

        # Category and ServiceArea
        self.category = Category.objects.create(
            name_en='Garbage Heap',
            name_hi='कचरे का ढेर',
            slug='garbage-heap',
            description='Accumulated trash',
            sort_order=1,
        )
        self.service_area = ServiceArea.objects.create(
            name='Test Ward 1',
            name_hi='वार्ड 1',
            description='Test area description',
            latitude=12.97,
            longitude=77.64,
            radius_meters=1500,
            responsible_team_name='Sanitation Unit A',
        )

        self.client = APIClient()

    def test_case_creation_and_auto_submission(self):
        """Citizen reports an issue via API; it starts as DRAFT and transitions to SUBMITTED."""
        self.client.force_authenticate(user=self.citizen)
        response = self.client.post('/api/v1/cases/', {
            'category': str(self.category.id),
            'service_area': str(self.service_area.id),
            'description': 'Overflowing bin near hospital gate.',
            'landmark': 'Gate No. 2, City Hospital',
            'latitude': 12.9712,
            'longitude': 77.6415,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        case_id = response.data['id']
        case = Case.objects.get(id=case_id)
        self.assertEqual(case.status, CaseStatus.SUBMITTED)
        self.assertTrue(case.case_number.startswith('CC-'))
        self.assertEqual(case.transitions.count(), 1)
        self.assertEqual(case.transitions.first().to_status, CaseStatus.SUBMITTED)

    def test_invalid_transition_rejected_by_state_machine(self):
        """Citizen cannot transition a submitted case to VERIFIED_RESOLVED."""
        case = Case.objects.create(
            primary_reporter=self.citizen,
            category=self.category,
            service_area=self.service_area,
            status=CaseStatus.SUBMITTED,
            description='Trash on lane',
            landmark='Opp Lane 4',
            latitude=12.97,
            longitude=77.64,
        )
        with self.assertRaises(ValueError):
            case.transition_to(CaseStatus.VERIFIED_RESOLVED, actor=self.citizen)

    def test_full_authorized_lifecycle_with_auditing(self):
        """Verify the full accountable lifecycle through authorized actors."""
        case = Case.objects.create(
            primary_reporter=self.citizen,
            category=self.category,
            service_area=self.service_area,
            status=CaseStatus.SUBMITTED,
            description='Trash on lane',
            landmark='Opp Lane 4',
            latitude=12.97,
            longitude=77.64,
        )

        # 1. Moderator reviews
        case.transition_to(CaseStatus.REVIEWED, actor=self.moderator, reason='Evidence verified')
        self.assertEqual(case.status, CaseStatus.REVIEWED)

        # 2. Moderator forwards to partner
        case.transition_to(CaseStatus.FORWARDED, actor=self.moderator, reason='Forwarded to Ward 1 sanitation crew')
        self.assertEqual(case.status, CaseStatus.FORWARDED)

        # 3. Operator acknowledges
        case.assigned_operator = self.operator
        case.save()
        case.transition_to(CaseStatus.ACKNOWLEDGED, actor=self.operator, reason='Team assigned and vehicle booked')
        self.assertEqual(case.status, CaseStatus.ACKNOWLEDGED)
        self.assertIsNotNone(case.acknowledged_at)

        # 4. Operator starts work
        case.transition_to(CaseStatus.IN_PROGRESS, actor=self.operator, reason='Crew on site')
        self.assertEqual(case.status, CaseStatus.IN_PROGRESS)

        # 5. Operator reports resolution
        case.transition_to(CaseStatus.RESOLUTION_REPORTED, actor=self.operator, reason='Cleaned and disinfected')
        self.assertEqual(case.status, CaseStatus.RESOLUTION_REPORTED)

        # 6. Verification pending
        case.transition_to(CaseStatus.VERIFICATION_PENDING, actor=self.operator, reason='After-photos uploaded')
        self.assertEqual(case.status, CaseStatus.VERIFICATION_PENDING)

        # 7. Citizen disputes closure claim
        case.transition_to(CaseStatus.DISPUTED_CLOSURE, actor=self.citizen, reason='Half the garbage is still left behind')
        self.assertEqual(case.status, CaseStatus.DISPUTED_CLOSURE)

        # 8. Moderator reopens back to In Progress
        case.transition_to(CaseStatus.IN_PROGRESS, actor=self.moderator, reason='Dispute accepted, requesting rework')
        self.assertEqual(case.status, CaseStatus.IN_PROGRESS)

        # Check that audit log entries exist for every transition
        audit_entries = AuditLog.objects.filter(resource_type='Case', resource_id=case.id)
        self.assertEqual(audit_entries.count(), 8)

    def test_rbac_queryset_isolation(self):
        """Citizens only see their own cases; Operators see assigned; Moderators see all."""
        c1 = Case.objects.create(
            primary_reporter=self.citizen,
            category=self.category,
            service_area=self.service_area,
            status=CaseStatus.SUBMITTED,
            description='Citizen 1 issue',
            landmark='L1',
            latitude=12.97,
            longitude=77.64,
        )
        c2 = Case.objects.create(
            primary_reporter=self.other_citizen,
            category=self.category,
            service_area=self.service_area,
            assigned_operator=self.operator,
            status=CaseStatus.IN_PROGRESS,
            description='Citizen 2 issue',
            landmark='L2',
            latitude=12.97,
            longitude=77.64,
        )

        # Citizen 1 request
        self.client.force_authenticate(user=self.citizen)
        resp = self.client.get('/api/v1/cases/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [item['id'] for item in resp.data['results']]
        self.assertIn(str(c1.id), ids)
        self.assertNotIn(str(c2.id), ids)

        # Operator request
        self.client.force_authenticate(user=self.operator)
        resp = self.client.get('/api/v1/cases/')
        ids = [item['id'] for item in resp.data['results']]
        self.assertNotIn(str(c1.id), ids)
        self.assertIn(str(c2.id), ids)

        # Moderator request
        self.client.force_authenticate(user=self.moderator)
        resp = self.client.get('/api/v1/cases/')
        ids = [item['id'] for item in resp.data['results']]
        self.assertIn(str(c1.id), ids)
        self.assertIn(str(c2.id), ids)
