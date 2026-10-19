import uuid
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from accounts.models import User
from areas.models import Category, ServiceArea
from cases.models import (
    Case, CaseStatus, CaseTransition, CaseObservation, Feedback, HotspotCheck
)
from rewards.models import RewardConfig, RewardLedger, RewardActionType


class Command(BaseCommand):
    help = 'Seeds initial realistic data for CitizenCivic pilot demonstration.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting data seeding...'))

        # 1. Categories
        categories_data = [
            {
                'name_en': 'Garbage Accumulation',
                'name_hi': 'कचरा संचय',
                'slug': 'garbage-accumulation',
                'description': 'Piles of uncollected residential or commercial garbage on streets or public spaces.',
                'sort_order': 1,
            },
            {
                'name_en': 'Missed Waste Collection',
                'name_hi': 'छूटा हुआ कचरा उठाव',
                'slug': 'missed-collection',
                'description': 'Scheduled doorstep or lane waste collection vehicle missed the pickup.',
                'sort_order': 2,
            },
            {
                'name_en': 'Recurring Garbage Hotspot',
                'name_hi': 'आवर्ती कचरा संवेदनशील स्थल',
                'slug': 'recurring-hotspot',
                'description': 'Chronic vulnerable location where dumping happens repeatedly after clearance.',
                'sort_order': 3,
            },
            {
                'name_en': 'Overflowing Public Bin',
                'name_hi': 'भरा हुआ सार्वजनिक डस्टबिन',
                'slug': 'overflowing-bin',
                'description': 'Community waste bin or dumper overflowing with litter spreading nearby.',
                'sort_order': 4,
            },
            {
                'name_en': 'Illegal Dumping',
                'name_hi': 'अवैध कचरा फेंकना',
                'slug': 'illegal-dumping',
                'description': 'Construction debris, commercial waste or hazardous dumping by unauthorized vehicles.',
                'sort_order': 5,
            },
        ]

        categories = {}
        for cat in categories_data:
            obj, _ = Category.objects.update_or_create(
                slug=cat['slug'],
                defaults=cat
            )
            categories[cat['slug']] = obj
        self.stdout.write(self.style.SUCCESS(f'Seeded {len(categories)} categories.'))

        # 2. Service Areas
        areas_data = [
            {
                'name': 'Indiranagar Ward 82',
                'name_hi': 'इंदिरानगर वार्ड 82',
                'description': 'Primary pilot zone covering 100ft road, CMH road, and adjacent residential avenues.',
                'latitude': 12.9784,
                'longitude': 77.6408,
                'radius_meters': 2500,
                'responsible_team_name': 'Indiranagar Solid Waste Operations Unit',
                'contact_info': 'Helpline: 080-25251234 | operations.ward82@partner.org',
                'escalation_rules': {
                    'ack_sla_hours': 4,
                    'resolve_sla_hours': 24,
                    'escalate_to': 'supervisor@example.com'
                },
                'operating_hours': {
                    'shifts': ['06:00-14:00', '14:00-22:00'],
                    'days': 'Mon-Sun'
                },
                'is_active': True,
            },
            {
                'name': 'Koramangala 4th Block',
                'name_hi': 'कोरमंगला चौथा ब्लॉक',
                'description': 'Secondary pilot zone covering 80ft road and residential blocks.',
                'latitude': 12.9344,
                'longitude': 77.6289,
                'radius_meters': 2000,
                'responsible_team_name': 'Koramangala Sanitation Wing',
                'contact_info': 'operations.kmg4@partner.org',
                'escalation_rules': {
                    'ack_sla_hours': 6,
                    'resolve_sla_hours': 36,
                    'escalate_to': 'supervisor@example.com'
                },
                'operating_hours': {
                    'shifts': ['06:30-14:30'],
                    'days': 'Mon-Sat'
                },
                'is_active': True,
            },
        ]

        service_areas = []
        for a in areas_data:
            obj, _ = ServiceArea.objects.update_or_create(
                name=a['name'],
                defaults=a
            )
            service_areas.append(obj)
        self.stdout.write(self.style.SUCCESS(f'Seeded {len(service_areas)} service areas.'))

        # 3. Users across all roles
        users_specs = [
            {
                'email': 'citizen@example.com',
                'password': 'Citizen123!',
                'display_name': 'Rahul Sharma',
                'role': User.Role.CITIZEN,
                'preferred_language': 'en',
                'is_verified': True,
            },
            {
                'email': 'citizen2@example.com',
                'password': 'Citizen123!',
                'display_name': 'Sunita Patel',
                'role': User.Role.CITIZEN,
                'preferred_language': 'hi',
                'is_verified': True,
            },
            {
                'email': 'moderator@example.com',
                'password': 'Moderator123!',
                'display_name': 'Priya Nair (Reviewer)',
                'role': User.Role.MODERATOR,
                'preferred_language': 'en',
                'is_verified': True,
            },
            {
                'email': 'operator@example.com',
                'password': 'Operator123!',
                'display_name': 'Suresh Kumar (Field Lead)',
                'role': User.Role.OPERATOR,
                'preferred_language': 'en',
                'is_verified': True,
            },
            {
                'email': 'supervisor@example.com',
                'password': 'Supervisor123!',
                'display_name': 'Anita Desai (Ward Supervisor)',
                'role': User.Role.SUPERVISOR,
                'preferred_language': 'en',
                'is_verified': True,
            },
            {
                'email': 'admin@example.com',
                'password': 'Admin123!',
                'display_name': 'System Administrator',
                'role': User.Role.ADMIN,
                'preferred_language': 'en',
                'is_verified': True,
                'is_staff': True,
                'is_superuser': True,
            },
        ]

        users = {}
        for u in users_specs:
            user = User.objects.filter(email=u['email']).first()
            if not user:
                user = User.objects.create_user(
                    username=u['email'],
                    email=u['email'],
                    password=u['password'],
                    display_name=u['display_name'],
                    role=u['role'],
                    preferred_language=u['preferred_language'],
                    is_verified=u['is_verified'],
                    is_staff=u.get('is_staff', False),
                    is_superuser=u.get('is_superuser', False),
                )
            else:
                user.display_name = u['display_name']
                user.role = u['role']
                user.set_password(u['password'])
                user.save()
            users[u['email']] = user
        self.stdout.write(self.style.SUCCESS(f'Seeded {len(users)} users across all roles.'))

        # 4. Reward Config
        reward_configs = [
            (RewardActionType.REPORT_SUBMITTED, 15, 'Points for reporting a verified civic issue with valid photo evidence'),
            (RewardActionType.REPORT_VERIFIED, 30, 'Points when issue cleanup is verified and confirmed'),
            (RewardActionType.OBSERVATION_ADDED, 10, 'Points for providing helpful on-ground status observations'),
            (RewardActionType.FEEDBACK_GIVEN, 5, 'Points for submitting constructive resolution feedback or rating'),
        ]
        for action_type, points, desc in reward_configs:
            RewardConfig.objects.update_or_create(
                action_type=action_type,
                defaults={'points_value': points, 'is_active': True, 'description': desc}
            )
        self.stdout.write(self.style.SUCCESS('Seeded reward configuration.'))

        # 5. Cases with real-world state transitions
        now = timezone.now()
        primary_area = service_areas[0]
        citizen1 = users['citizen@example.com']
        moderator = users['moderator@example.com']
        operator = users['operator@example.com']
        supervisor = users['supervisor@example.com']

        # Case 1: Fresh Submitted
        case1, created = Case.objects.get_or_create(
            case_number='CC-20261019-A101',
            defaults={
                'primary_reporter': citizen1,
                'category': categories['garbage-accumulation'],
                'service_area': primary_area,
                'status': CaseStatus.SUBMITTED,
                'description': 'Severe waste accumulation on the footpath opposite Metro pillar 45. Pedestrians forced to walk on busy main road.',
                'landmark': 'Opposite Metro Pillar 45, CMH Road, Indiranagar',
                'latitude': 12.9782,
                'longitude': 77.6405,
                'is_hotspot': False,
            }
        )
        if created:
            CaseTransition.objects.create(
                case=case1, from_status=CaseStatus.DRAFT, to_status=CaseStatus.SUBMITTED,
                actor=citizen1, reason='Citizen submitted report with geo-tagged photograph.',
            )

        # Case 2: In Progress (Acknowledged and assigned to operator)
        case2, created = Case.objects.get_or_create(
            case_number='CC-20261018-B202',
            defaults={
                'primary_reporter': citizen1,
                'category': categories['overflowing-bin'],
                'service_area': primary_area,
                'assigned_operator': operator,
                'status': CaseStatus.IN_PROGRESS,
                'description': 'Twin commercial waste bins overflowing since yesterday evening. Stray cattle and dogs scattering waste.',
                'landmark': 'Corner of 12th Main and 5th Cross, near BDA Complex',
                'latitude': 12.9721,
                'longitude': 77.6389,
                'is_hotspot': True,
                'acknowledged_at': now - timedelta(hours=6),
            }
        )
        if created:
            CaseTransition.objects.create(
                case=case2, from_status=CaseStatus.DRAFT, to_status=CaseStatus.SUBMITTED,
                actor=citizen1, reason='Initial report submission',
                created_at=now - timedelta(hours=14)
            )
            CaseTransition.objects.create(
                case=case2, from_status=CaseStatus.SUBMITTED, to_status=CaseStatus.REVIEWED,
                actor=moderator, reason='Evidence checked: clear location and high severity overflow',
                created_at=now - timedelta(hours=10)
            )
            CaseTransition.objects.create(
                case=case2, from_status=CaseStatus.REVIEWED, to_status=CaseStatus.FORWARDED,
                actor=moderator, reason='Forwarded to Indiranagar Solid Waste Operations Unit',
                created_at=now - timedelta(hours=8)
            )
            CaseTransition.objects.create(
                case=case2, from_status=CaseStatus.FORWARDED, to_status=CaseStatus.ACKNOWLEDGED,
                actor=operator, reason='Operator confirmed receipt. Team truck scheduled for dispatch.',
                created_at=now - timedelta(hours=6)
            )
            CaseTransition.objects.create(
                case=case2, from_status=CaseStatus.ACKNOWLEDGED, to_status=CaseStatus.IN_PROGRESS,
                actor=operator, reason='Compact truck #KA-03-GA-1024 on site. Clearing in progress.',
                created_at=now - timedelta(hours=2)
            )
            CaseObservation.objects.create(
                case=case2, reporter=citizen1,
                description='Sanitation crew arrived with truck at 10 AM, loading bulk waste.',
                latitude=12.9722, longitude=77.6390, observed_at=now - timedelta(hours=1)
            )

        # Case 3: Verification Pending (Operator finished cleanup, citizen/mod review pending)
        case3, created = Case.objects.get_or_create(
            case_number='CC-20261017-C303',
            defaults={
                'primary_reporter': citizen1,
                'category': categories['missed-collection'],
                'service_area': primary_area,
                'assigned_operator': operator,
                'status': CaseStatus.VERIFICATION_PENDING,
                'description': 'Door-to-door green waste collection skipped for 3 consecutive days on 7th A Cross.',
                'landmark': '7th A Cross, near Mother Teresa Children Home',
                'latitude': 12.9750,
                'longitude': 77.6430,
                'is_hotspot': False,
                'acknowledged_at': now - timedelta(days=2),
                'resolved_at': now - timedelta(hours=4),
            }
        )
        if created:
            CaseTransition.objects.create(
                case=case3, from_status=CaseStatus.IN_PROGRESS, to_status=CaseStatus.RESOLUTION_REPORTED,
                actor=operator, reason='Special collection run completed for all 45 houses on 7th A Cross.',
                created_at=now - timedelta(hours=5)
            )
            CaseTransition.objects.create(
                case=case3, from_status=CaseStatus.RESOLUTION_REPORTED, to_status=CaseStatus.VERIFICATION_PENDING,
                actor=operator, reason='After-cleanup photos uploaded. Awaiting citizen confirmation.',
                created_at=now - timedelta(hours=4)
            )

        # Case 4: Verified Resolved (Closed with 7-day hotspot follow-up check scheduled)
        case4, created = Case.objects.get_or_create(
            case_number='CC-20261015-D404',
            defaults={
                'primary_reporter': citizen1,
                'category': categories['recurring-hotspot'],
                'service_area': primary_area,
                'assigned_operator': operator,
                'status': CaseStatus.VERIFIED_RESOLVED,
                'description': 'Chronic blackspot near stormwater drain culvert. Mixed wet and dry plastic waste.',
                'landmark': 'Stormwater Drain culvert, 100ft road junction',
                'latitude': 12.9690,
                'longitude': 77.6415,
                'is_hotspot': True,
                'acknowledged_at': now - timedelta(days=4),
                'resolved_at': now - timedelta(days=2),
                'verified_at': now - timedelta(days=1),
            }
        )
        if created:
            CaseTransition.objects.create(
                case=case4, from_status=CaseStatus.VERIFICATION_PENDING, to_status=CaseStatus.VERIFIED_RESOLVED,
                actor=moderator, reason='Independent on-ground inspection confirmed completely cleared, sanitized and lime-powdered.',
                created_at=now - timedelta(days=1)
            )
            Feedback.objects.create(
                case=case4, user=citizen1, feedback_type='SATISFACTION',
                rating=5, comment='Spot is completely clear and sanitized. Very prompt resolution!'
            )
            # Schedule 7-day and 30-day hotspot checks
            HotspotCheck.objects.create(
                original_case=case4,
                check_type=HotspotCheck.CheckType.SEVEN_DAY,
                result=HotspotCheck.Result.PENDING,
                scheduled_for=now + timedelta(days=6),
                notes='Automated follow-up audit to verify spot remains clean.'
            )
            HotspotCheck.objects.create(
                original_case=case4,
                check_type=HotspotCheck.CheckType.THIRTY_DAY,
                result=HotspotCheck.Result.PENDING,
                scheduled_for=now + timedelta(days=29),
                notes='30-day sustainability check for chronic blackspot.'
            )
            # Give points for verified resolution
            RewardLedger.objects.get_or_create(
                idempotency_key=f'report_verified_{case4.id}_{citizen1.id}',
                defaults={
                    'user': citizen1,
                    'points': 45,
                    'reason': f'Resolved & verified report {case4.case_number}',
                    'related_case': case4,
                }
            )

        self.stdout.write(self.style.SUCCESS('Successfully seeded pilot cases, state transitions, feedback, and hotspot follow-ups!'))
