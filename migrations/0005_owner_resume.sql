-- Owner-requested import from his public professional site's actual PDF, 2026-11-06.
-- This runs once; an existing edited profile is preserved. No target roles are invented.
ALTER TABLE profile ADD COLUMN resume_source_url TEXT NOT NULL DEFAULT '';
ALTER TABLE profile ADD COLUMN resume_original_url TEXT NOT NULL DEFAULT '';
ALTER TABLE profile ADD COLUMN resume_sha256 TEXT NOT NULL DEFAULT '';
UPDATE profile SET full_name='Abdulmajeed Alamri',email='abdulmjedalamri1@gmail.com',phone='+966550200170',
 resume_text='ABDULMAJEED ALAMRI
Business Development Specialist | B2B & B2G Sales | Software Solutions & Government Tenders
Riyadh, Saudi Arabia | +966 550200170 | abdulmjedalamri1@gmail.com
PROFESSIONAL SUMMARY
Business Development Specialist with experience across B2B/B2G sales, software solutions, government
tenders, sponsorship sales, and project-based commercial growth. Delivered and contributed to SAR 39M+
in commercial achievements across technology, events, sponsorships, and public-sector projects. Skilled
in client acquisition, qualified pipeline building, proposal coordination, stakeholder management, and
converting opportunities into closed deals.
CORE KEYWORDS & COMPETENCIES
B2B & B2G Sales | Software Solutions Sales | Digital Experience Solutions | Government Procurement |
Tender Management | RFP/RFQ Coordination | Proposal Development | Lead Generation | Pipeline
Management | Client Acquisition | Strategic Partnerships | Sponsorship Sales | Stakeholder Engagement
| Account Management | CRM Usage | Sales Enablement | AI-Assisted Research & Sales Workflows
SELECTED TOOLS
HubSpot CRM | Sales Hub | Sales Enablement | Inbound Sales | Revenue Operations Basics | Google AI |
Microsoft Excel | Etimad | Government Procurement Platforms | CRM & Sales Tracking Tools
PROFESSIONAL EXPERIENCE
Business Development Specialist
eSense | 01/2026 - Present
- Drive B2B/B2G business development for digital experience solutions, software systems, and enterprise
technology services.
- Closed new client deals with the High Commission for Industrial Security (HCIS) and Takamol Business
Services.
- Built and managed a qualified database of 10,000+ B2B/B2G leads across government and enterprise
sectors.
- Identify and develop new commercial opportunities through direct outreach, strategic account targeting,
and government procurement platforms.
- Coordinate with internal technical and commercial teams to align client needs with suitable digital and
software solutions.
Business Development Specialist
Kite Marketing Services | 02/2024 - 12/2025
- Managed B2B/B2G business development activities across government and private-sector opportunities.
- Contributed to achieving annual sales targets of SAR 10M through tenders, direct outreach, and client
expansion.
- Secured and supported major commercial opportunities, including a SAR 3.5M contract with Tatweer
Education Holding.
- Led and coordinated technical and commercial proposal preparation for government tenders and
strategic accounts.
PROFESSIONAL EXPERIENCE - CONTINUED
Sales Specialist - Project Contract
Green Sustainability Association | MODON Industrial Cities Afforestation Project | 01/2023 - 12/2023
- Contracted by Green Sustainability Association to support sales activities for MODON''s Industrial Cities
Afforestation Project.
- Sold 100,000 seedlings as part of the industrial-city greening initiative.
- Managed sales follow-ups and stakeholder coordination across a non-profit and government-linked
project environment.
- Supported project execution by aligning sales targets, client communication, and delivery requirements.
Sales Specialist - Project Contract
Nexus Company | 08/2022 - 12/2022
- Managed sales activities for Sand & Fun Aviation Exhibition under the Saudi Aviation Club.
- Closed sponsorship deals totaling SAR 10M and supported exhibition-space sales for aviation-sector
partners and exhibitors.
- Coordinated commercial follow-ups with prospects, partners, and event stakeholders until project
completion.
Sales & Marketing Representative
Your Event Company | 11/2021 - 06/2022
- Supported sales and marketing activities for events, activations, and client projects.
- Assisted in client outreach, proposal follow-up, and coordination with internal teams.
- Built early experience in B2B communication, stakeholder handling, and project-based sales.
EDUCATION
Bachelor''s Degree in Hebrew Language
King Saud University
LANGUAGES
Arabic: Native | English: Professional
CERTIFICATIONS & PROFESSIONAL DEVELOPMENT
- HubSpot Revenue Operations Certified - HubSpot Academy
- HubSpot Sales Hub Software Certified - HubSpot Academy
- HubSpot Sales Enablement Certified - HubSpot Academy
- HubSpot Inbound Sales Certified - HubSpot Academy
- Google AI Professional Certificate - Google / Coursera
- Critical Thinking in the Age of AI - HP LIFE
- Project Management Professional Program - Oxford Training Academy
- KPIs & Balanced Scorecard Practitioner - American Institute of Professional Studies
- ISO 22301 Business Continuity Management - U.S. Industrial Accreditation
- Total Quality Management & Operational Management - TVTC',resume_source_url='https://alamri-bd.lovable.app/',
 resume_original_url='https://alamri-bd.lovable.app/__l5e/assets-v1/5e16b0eb-464a-4fd9-89ab-cdcedaf4ab85/Abdulmajeed-Alamri-CV.pdf',resume_sha256='41433a8937d9f78e842b575e21cd3fdb2605db855ec49cf0d579ebbd25e65eab',updated_at=CURRENT_TIMESTAMP
 WHERE id=1 AND trim(resume_text)='' AND trim(full_name)='' AND trim(email)='' AND trim(phone)='';
