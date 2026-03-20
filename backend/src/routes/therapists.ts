import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, ilike, sql, asc, desc } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

const SEED_DATA = [
  {
    name: 'Sarah Chen',
    photoUrl: 'https://i.pravatar.cc/300?img=1',
    title: 'Registered Clinical Counsellor',
    bio: 'Sarah Chen is a Registered Clinical Counsellor with over 8 years of experience helping clients navigate anxiety, depression, and life transitions. She uses a collaborative, strengths-based approach tailored to each individual\'s needs. Sarah is fluent in English, Mandarin, and Cantonese.',
    location: 'Vancouver',
    gender: 'Female',
    specialties: ['Anxiety', 'Depression', 'Stress'],
    therapyTypes: ['CBT', 'Mindfulness-Based', 'Solution-Focused'],
    insurances: ['Blue Cross', 'Sun Life', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '160',
    languages: ['English', 'Mandarin', 'Cantonese'],
    yearsExperience: 8,
    phone: '604-555-0101',
    email: 'sarah.chen@counselling.bc.ca',
    websiteUrl: 'https://sarahchencounselling.ca',
  },
  {
    name: 'James Okafor',
    photoUrl: 'https://i.pravatar.cc/300?img=3',
    title: 'Psychologist',
    bio: 'Dr. James Okafor is a registered Psychologist specializing in trauma, PTSD, and addiction recovery. With 15 years of clinical experience, he integrates EMDR and psychodynamic approaches to support lasting healing. He works with adults and first responders across the Lower Mainland.',
    location: 'Surrey',
    gender: 'Male',
    specialties: ['Trauma', 'PTSD', 'Addiction'],
    therapyTypes: ['EMDR', 'Psychodynamic', 'ACT'],
    insurances: ['ICBC', 'WorkSafeBC', 'Great-West Life', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '200',
    languages: ['English'],
    yearsExperience: 15,
    phone: '604-555-0202',
    email: 'james.okafor@psychservices.bc.ca',
    websiteUrl: 'https://jamesokaforpsych.ca',
  },
  {
    name: 'Priya Sharma',
    photoUrl: 'https://i.pravatar.cc/300?img=5',
    title: 'Registered Clinical Counsellor',
    bio: 'Priya Sharma is a compassionate counsellor who specializes in anxiety, relationship challenges, and grief. She draws on CBT and narrative therapy to help clients rewrite unhelpful patterns and build resilience. Priya offers sessions in English and Punjabi.',
    location: 'Burnaby',
    gender: 'Female',
    specialties: ['Anxiety', 'Relationships', 'Grief'],
    therapyTypes: ['CBT', 'DBT', 'Narrative Therapy'],
    insurances: ['Sun Life', 'Manulife', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '150',
    languages: ['English', 'Punjabi'],
    yearsExperience: 6,
    phone: '778-555-0303',
    email: 'priya.sharma@mindfulcounselling.ca',
    websiteUrl: null,
  },
  {
    name: 'Michael Tremblay',
    photoUrl: 'https://i.pravatar.cc/300?img=8',
    title: 'Registered Psychotherapist',
    bio: 'Michael Tremblay is a bilingual Registered Psychotherapist based in Victoria with 11 years of experience treating depression, OCD, and chronic stress. He uses evidence-based CBT and ACT frameworks to help clients develop practical coping strategies. Michael offers sessions in both English and French.',
    location: 'Victoria',
    gender: 'Male',
    specialties: ['Depression', 'OCD', 'Stress'],
    therapyTypes: ['CBT', 'ACT', 'Mindfulness-Based'],
    insurances: ['Blue Cross', 'Great-West Life', 'Desjardins', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '175',
    languages: ['English', 'French'],
    yearsExperience: 11,
    phone: '250-555-0404',
    email: 'michael.tremblay@victoriacounselling.ca',
    websiteUrl: 'https://tremblaypsychotherapy.ca',
  },
  {
    name: 'Aisha Mohammed',
    photoUrl: 'https://i.pravatar.cc/300?img=10',
    title: 'Registered Clinical Counsellor',
    bio: 'Aisha Mohammed is a dedicated counsellor with a focus on anxiety, eating disorders, and ADHD in adolescents and young adults. She uses DBT and somatic approaches to help clients build emotional regulation skills. Aisha creates a warm, non-judgmental space for every client.',
    location: 'Richmond',
    gender: 'Female',
    specialties: ['Anxiety', 'Eating Disorders', 'ADHD'],
    therapyTypes: ['DBT', 'CBT', 'Somatic Therapy'],
    insurances: ['Blue Cross', 'Sun Life', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '155',
    languages: ['English'],
    yearsExperience: 5,
    phone: '604-555-0505',
    email: 'aisha.mohammed@richmondwellness.ca',
    websiteUrl: null,
  },
  {
    name: 'David Nguyen',
    photoUrl: 'https://i.pravatar.cc/300?img=12',
    title: 'Psychologist',
    bio: 'Dr. David Nguyen is a registered Psychologist with 18 years of experience in trauma, depression, and relationship therapy. He is trained in EMDR and psychodynamic therapy, offering a deep and integrative approach to healing. David sees clients in English and Vietnamese.',
    location: 'Vancouver',
    gender: 'Male',
    specialties: ['Trauma', 'Depression', 'Relationships'],
    therapyTypes: ['EMDR', 'Psychodynamic', 'Solution-Focused'],
    insurances: ['ICBC', 'Manulife', 'Great-West Life', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '210',
    languages: ['English', 'Vietnamese'],
    yearsExperience: 18,
    phone: '604-555-0606',
    email: 'david.nguyen@drnguyenpsych.ca',
    websiteUrl: 'https://drnguyenpsych.ca',
  },
  {
    name: 'Emma Johansson',
    photoUrl: 'https://i.pravatar.cc/300?img=16',
    title: 'Registered Clinical Counsellor',
    bio: 'Emma Johansson is a Kelowna-based counsellor specializing in grief, stress management, and anger. She uses mindfulness and narrative therapy to help clients process difficult emotions and find new perspectives. Emma is committed to creating a safe and supportive therapeutic environment.',
    location: 'Kelowna',
    gender: 'Female',
    specialties: ['Grief', 'Stress', 'Anger Management'],
    therapyTypes: ['Mindfulness-Based', 'Narrative Therapy', 'Solution-Focused'],
    insurances: ['Sun Life', 'Blue Cross', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '145',
    languages: ['English'],
    yearsExperience: 7,
    phone: '250-555-0707',
    email: 'emma.johansson@kelownacounselling.ca',
    websiteUrl: null,
  },
  {
    name: 'Raj Patel',
    photoUrl: 'https://i.pravatar.cc/300?img=18',
    title: 'Registered Clinical Counsellor',
    bio: 'Raj Patel is an experienced counsellor in Abbotsford with a focus on addiction recovery, anxiety, and depression. He uses CBT and motivational interviewing to support clients in making meaningful life changes. Raj offers culturally sensitive care in English, Punjabi, and Hindi.',
    location: 'Abbotsford',
    gender: 'Male',
    specialties: ['Addiction', 'Anxiety', 'Depression'],
    therapyTypes: ['CBT', 'ACT', 'Motivational Interviewing'],
    insurances: ['WorkSafeBC', 'Manulife', 'Desjardins', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '140',
    languages: ['English', 'Punjabi', 'Hindi'],
    yearsExperience: 9,
    phone: '604-555-0808',
    email: 'raj.patel@abbotsfordcounselling.ca',
    websiteUrl: 'https://rajpatelcounselling.ca',
  },
  {
    name: 'Mei-Ling Wu',
    photoUrl: 'https://i.pravatar.cc/300?img=20',
    title: 'Registered Psychotherapist',
    bio: 'Mei-Ling Wu is a Registered Psychotherapist specializing in ADHD, OCD, and anxiety disorders. She integrates CBT and somatic approaches to address both the cognitive and physical dimensions of mental health. Mei-Ling is passionate about supporting clients from diverse cultural backgrounds.',
    location: 'Vancouver',
    gender: 'Female',
    specialties: ['ADHD', 'OCD', 'Anxiety'],
    therapyTypes: ['CBT', 'DBT', 'Somatic Therapy'],
    insurances: ['Blue Cross', 'Sun Life', 'Manulife', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '170',
    languages: ['English', 'Mandarin'],
    yearsExperience: 10,
    phone: '778-555-0909',
    email: 'meiling.wu@vancouvertherapy.ca',
    websiteUrl: 'https://meilingwutherapy.ca',
  },
  {
    name: 'Thomas Blackwood',
    photoUrl: 'https://i.pravatar.cc/300?img=22',
    title: 'Psychologist',
    bio: 'Dr. Thomas Blackwood is a seasoned Psychologist in Kamloops with 20 years of experience treating PTSD, trauma, and anger management issues. He is a certified EMDR therapist and works extensively with veterans and first responders. Thomas takes a compassionate, evidence-based approach to every client.',
    location: 'Kamloops',
    gender: 'Male',
    specialties: ['PTSD', 'Trauma', 'Anger Management'],
    therapyTypes: ['EMDR', 'CBT', 'Psychodynamic'],
    insurances: ['ICBC', 'WorkSafeBC', 'Great-West Life', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '195',
    languages: ['English'],
    yearsExperience: 20,
    phone: '250-555-1010',
    email: 'thomas.blackwood@kamloopspsych.ca',
    websiteUrl: 'https://blackwoodpsychology.ca',
  },
  {
    name: 'Fatima Al-Hassan',
    photoUrl: 'https://i.pravatar.cc/300?img=25',
    title: 'Registered Clinical Counsellor',
    bio: 'Fatima Al-Hassan is a culturally informed counsellor supporting clients through depression, grief, and relationship difficulties. She draws on narrative therapy and mindfulness to help clients reconnect with their strengths and values. Fatima offers a welcoming space for clients from all cultural backgrounds.',
    location: 'Surrey',
    gender: 'Female',
    specialties: ['Depression', 'Grief', 'Relationships'],
    therapyTypes: ['Narrative Therapy', 'Psychodynamic', 'Mindfulness-Based'],
    insurances: ['Blue Cross', 'Desjardins', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '155',
    languages: ['English', 'Arabic'],
    yearsExperience: 8,
    phone: '604-555-1111',
    email: 'fatima.alhassan@surreycounselling.ca',
    websiteUrl: null,
  },
  {
    name: 'Liam Fitzgerald',
    photoUrl: 'https://i.pravatar.cc/300?img=27',
    title: 'Registered Clinical Counsellor',
    bio: 'Liam Fitzgerald is a Nanaimo-based counsellor who works with adults experiencing anxiety, stress, and ADHD. He uses solution-focused and ACT approaches to help clients identify practical goals and build momentum. Liam is known for his approachable, down-to-earth style.',
    location: 'Nanaimo',
    gender: 'Male',
    specialties: ['Anxiety', 'Stress', 'ADHD'],
    therapyTypes: ['CBT', 'Solution-Focused', 'ACT'],
    insurances: ['Sun Life', 'Great-West Life', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '145',
    languages: ['English'],
    yearsExperience: 4,
    phone: '250-555-1212',
    email: 'liam.fitzgerald@nanaimocounselling.ca',
    websiteUrl: null,
  },
  {
    name: 'Yuki Tanaka',
    photoUrl: 'https://i.pravatar.cc/300?img=30',
    title: 'Registered Psychotherapist',
    bio: 'Yuki Tanaka is a Registered Psychotherapist with 12 years of experience treating eating disorders, depression, and anxiety. She uses a body-inclusive approach combining DBT and somatic therapy to support holistic recovery. Yuki offers sessions in English and Japanese.',
    location: 'Vancouver',
    gender: 'Female',
    specialties: ['Eating Disorders', 'Depression', 'Anxiety'],
    therapyTypes: ['DBT', 'CBT', 'Somatic Therapy'],
    insurances: ['Manulife', 'Blue Cross', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '180',
    languages: ['English', 'Japanese'],
    yearsExperience: 12,
    phone: '604-555-1313',
    email: 'yuki.tanaka@vancouvertherapy.ca',
    websiteUrl: 'https://yukitanakatherapy.ca',
  },
  {
    name: 'Carlos Rivera',
    photoUrl: 'https://i.pravatar.cc/300?img=33',
    title: 'Registered Clinical Counsellor',
    bio: 'Carlos Rivera is a bilingual counsellor in Burnaby specializing in relationship issues, addiction, and stress. He uses ACT and motivational interviewing to help clients align their actions with their core values. Carlos offers sessions in English and Spanish.',
    location: 'Burnaby',
    gender: 'Male',
    specialties: ['Relationships', 'Addiction', 'Stress'],
    therapyTypes: ['ACT', 'CBT', 'Motivational Interviewing'],
    insurances: ['WorkSafeBC', 'Manulife', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '150',
    languages: ['English', 'Spanish'],
    yearsExperience: 7,
    phone: '778-555-1414',
    email: 'carlos.rivera@burnabycounselling.ca',
    websiteUrl: null,
  },
  {
    name: 'Ingrid Sorensen',
    photoUrl: 'https://i.pravatar.cc/300?img=35',
    title: 'Psychologist',
    bio: 'Dr. Ingrid Sorensen is a Victoria-based Psychologist with over 22 years of experience in trauma and PTSD treatment. She is a certified EMDR therapist and integrates psychodynamic insights to support deep, lasting change. Ingrid works with adults navigating complex trauma and life transitions.',
    location: 'Victoria',
    gender: 'Female',
    specialties: ['Trauma', 'PTSD', 'Depression'],
    therapyTypes: ['EMDR', 'Psychodynamic', 'CBT'],
    insurances: ['ICBC', 'Blue Cross', 'Great-West Life', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '215',
    languages: ['English'],
    yearsExperience: 22,
    phone: '250-555-1515',
    email: 'ingrid.sorensen@victoriapsych.ca',
    websiteUrl: 'https://ingridsorensen.ca',
  },
  {
    name: 'Kevin Park',
    photoUrl: 'https://i.pravatar.cc/300?img=38',
    title: 'Registered Clinical Counsellor',
    bio: 'Kevin Park is a Richmond-based counsellor with expertise in anxiety, OCD, and stress management. He uses CBT and mindfulness-based techniques to help clients break free from unhelpful thought patterns. Kevin is committed to providing culturally sensitive care for Korean-speaking clients.',
    location: 'Richmond',
    gender: 'Male',
    specialties: ['Anxiety', 'OCD', 'Stress'],
    therapyTypes: ['CBT', 'ACT', 'Mindfulness-Based'],
    insurances: ['Sun Life', 'Desjardins', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '160',
    languages: ['English', 'Korean'],
    yearsExperience: 6,
    phone: '604-555-1616',
    email: 'kevin.park@richmondcounselling.ca',
    websiteUrl: null,
  },
  {
    name: 'Amara Diallo',
    photoUrl: 'https://i.pravatar.cc/300?img=40',
    title: 'Registered Clinical Counsellor',
    bio: 'Amara Diallo is a compassionate counsellor supporting clients through grief, anger, and depression. She uses narrative therapy and solution-focused approaches to help clients discover their inner resources. Amara offers sessions in English and French.',
    location: 'Vancouver',
    gender: 'Female',
    specialties: ['Grief', 'Anger Management', 'Depression'],
    therapyTypes: ['Narrative Therapy', 'Solution-Focused', 'CBT'],
    insurances: ['Blue Cross', 'Manulife', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '155',
    languages: ['English', 'French'],
    yearsExperience: 5,
    phone: '778-555-1717',
    email: 'amara.diallo@vancouvercounselling.ca',
    websiteUrl: null,
  },
  {
    name: 'Nathan Kowalski',
    photoUrl: 'https://i.pravatar.cc/300?img=43',
    title: 'Registered Psychotherapist',
    bio: 'Nathan Kowalski is a Kelowna-based psychotherapist specializing in ADHD, addiction, and relationship challenges. He uses DBT and ACT to help clients develop emotional regulation and build healthier connections. Nathan has a particular interest in supporting young adults through major life transitions.',
    location: 'Kelowna',
    gender: 'Male',
    specialties: ['ADHD', 'Addiction', 'Relationships'],
    therapyTypes: ['DBT', 'ACT', 'CBT'],
    insurances: ['WorkSafeBC', 'Great-West Life', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '165',
    languages: ['English'],
    yearsExperience: 9,
    phone: '250-555-1818',
    email: 'nathan.kowalski@kelownatherapy.ca',
    websiteUrl: 'https://nathankowalski.ca',
  },
  {
    name: 'Lin Zhao',
    photoUrl: 'https://i.pravatar.cc/300?img=45',
    title: 'Registered Clinical Counsellor',
    bio: 'Lin Zhao is a trilingual counsellor in Vancouver with 13 years of experience in anxiety, depression, and trauma. She integrates CBT and EMDR to provide evidence-based, culturally attuned care. Lin is deeply committed to supporting clients from Chinese-speaking communities.',
    location: 'Vancouver',
    gender: 'Female',
    specialties: ['Anxiety', 'Depression', 'Trauma'],
    therapyTypes: ['CBT', 'EMDR', 'Mindfulness-Based'],
    insurances: ['Blue Cross', 'Sun Life', 'Manulife', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '170',
    languages: ['English', 'Mandarin', 'Cantonese'],
    yearsExperience: 13,
    phone: '604-555-1919',
    email: 'lin.zhao@linzhaocounselling.ca',
    websiteUrl: 'https://linzhaocounselling.ca',
  },
  {
    name: 'Omar Hassan',
    photoUrl: 'https://i.pravatar.cc/300?img=48',
    title: 'Registered Clinical Counsellor',
    bio: 'Omar Hassan is a counsellor in Abbotsford who works with clients experiencing stress, relationship difficulties, and anger. He uses solution-focused and narrative approaches to help clients build on their existing strengths. Omar provides culturally sensitive support for East African communities.',
    location: 'Abbotsford',
    gender: 'Male',
    specialties: ['Stress', 'Relationships', 'Anger Management'],
    therapyTypes: ['Solution-Focused', 'CBT', 'Narrative Therapy'],
    insurances: ['Manulife', 'Desjardins', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '140',
    languages: ['English', 'Somali'],
    yearsExperience: 3,
    phone: '604-555-2020',
    email: 'omar.hassan@abbotsfordwellness.ca',
    websiteUrl: null,
  },
  {
    name: 'Sophie Beaumont',
    photoUrl: 'https://i.pravatar.cc/300?img=50',
    title: 'Psychologist',
    bio: 'Dr. Sophie Beaumont is a bilingual Psychologist serving Prince George and Northern BC with 16 years of clinical experience. She specializes in depression, anxiety, and grief using psychodynamic and CBT approaches. Sophie is dedicated to improving access to quality mental health care in rural communities.',
    location: 'Prince George',
    gender: 'Female',
    specialties: ['Depression', 'Anxiety', 'Grief'],
    therapyTypes: ['Psychodynamic', 'CBT', 'Mindfulness-Based'],
    insurances: ['Blue Cross', 'Great-West Life', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '190',
    languages: ['English', 'French'],
    yearsExperience: 16,
    phone: '250-555-2121',
    email: 'sophie.beaumont@pgpsychology.ca',
    websiteUrl: 'https://sophiebeaumont.ca',
  },
  {
    name: 'Harpreet Gill',
    photoUrl: 'https://i.pravatar.cc/300?img=53',
    title: 'Registered Clinical Counsellor',
    bio: 'Harpreet Gill is a Surrey-based counsellor with 10 years of experience in anxiety, PTSD, and relationship therapy. She is trained in EMDR and DBT, offering an integrative approach to trauma and emotional regulation. Harpreet provides culturally sensitive care in English, Punjabi, and Hindi.',
    location: 'Surrey',
    gender: 'Female',
    specialties: ['Anxiety', 'PTSD', 'Relationships'],
    therapyTypes: ['EMDR', 'DBT', 'CBT'],
    insurances: ['ICBC', 'Sun Life', 'Blue Cross', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '160',
    languages: ['English', 'Punjabi', 'Hindi'],
    yearsExperience: 10,
    phone: '604-555-2222',
    email: 'harpreet.gill@surreywellness.ca',
    websiteUrl: null,
  },
  {
    name: 'Alex Morgan',
    photoUrl: 'https://i.pravatar.cc/300?img=56',
    title: 'Registered Clinical Counsellor',
    bio: 'Alex Morgan is a non-binary counsellor in Burnaby with a focus on anxiety, depression, and LGBTQ+ affirming care. They use ACT and somatic therapy to help clients connect with their authentic selves. Alex is committed to creating an inclusive, affirming space for all gender identities and sexual orientations.',
    location: 'Burnaby',
    gender: 'Non-binary',
    specialties: ['Anxiety', 'Depression', 'LGBTQ+'],
    therapyTypes: ['ACT', 'CBT', 'Somatic Therapy'],
    insurances: ['Blue Cross', 'Manulife', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '155',
    languages: ['English'],
    yearsExperience: 6,
    phone: '778-555-2323',
    email: 'alex.morgan@burnabycounselling.ca',
    websiteUrl: 'https://alexmorgancounselling.ca',
  },
  {
    name: 'Patricia Lam',
    photoUrl: 'https://i.pravatar.cc/300?img=60',
    title: 'Registered Psychotherapist',
    bio: 'Patricia Lam is a Registered Psychotherapist in Richmond with 14 years of experience in grief, depression, and eating disorder recovery. She uses psychodynamic and narrative therapy to help clients explore the deeper roots of their struggles. Patricia offers sessions in English and Cantonese.',
    location: 'Richmond',
    gender: 'Female',
    specialties: ['Grief', 'Depression', 'Eating Disorders'],
    therapyTypes: ['Psychodynamic', 'Narrative Therapy', 'DBT'],
    insurances: ['Sun Life', 'Great-West Life', 'Desjardins', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '175',
    languages: ['English', 'Cantonese'],
    yearsExperience: 14,
    phone: '604-555-2424',
    email: 'patricia.lam@richmondtherapy.ca',
    websiteUrl: 'https://patricialamtherapy.ca',
  },
  {
    name: 'Daniel Whitehorse',
    photoUrl: 'https://i.pravatar.cc/300?img=65',
    title: 'Registered Clinical Counsellor',
    bio: 'Daniel Whitehorse is a Kamloops-based counsellor with 11 years of experience in addiction, trauma, and stress. He integrates CBT and EMDR to support clients in processing difficult experiences and building sustainable recovery. Daniel has a strong commitment to serving Indigenous and rural communities in the BC Interior.',
    location: 'Kamloops',
    gender: 'Male',
    specialties: ['Addiction', 'Trauma', 'Stress'],
    therapyTypes: ['CBT', 'EMDR', 'Motivational Interviewing'],
    insurances: ['WorkSafeBC', 'ICBC', 'Blue Cross', 'Self-pay'],
    acceptingNewClients: true,
    sessionFee: '145',
    languages: ['English'],
    yearsExperience: 11,
    phone: '250-555-2525',
    email: 'daniel.whitehorse@kamloopscounselling.ca',
    websiteUrl: null,
  },
];

async function seedTherapists(app: App) {
  app.logger.info('Checking if therapists need to be seeded');
  const count = await app.db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(schema.therapists);

  if (count[0].count === 0) {
    app.logger.info('Seeding therapists table with 25 records');
    await app.db.insert(schema.therapists).values(SEED_DATA);
    app.logger.info('Therapists seeded successfully');
  } else {
    app.logger.info({ existingCount: count[0].count }, 'Therapists table already populated, skipping seed');
  }

  // Insert Nancy Brooks with ON CONFLICT
  app.logger.info('Inserting Nancy Brooks with ON CONFLICT');
  await app.db.insert(schema.therapists).values({
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' as any,
    name: 'Nancy Brooks',
    photoUrl: 'https://i.pravatar.cc/300?u=nancybrooks',
    title: 'PsyD, NCC, RCC',
    bio: 'Dr. Nancy Brooks is a registered clinical counsellor with a Doctorate in Psychology. She brings a warm, collaborative approach to therapy, helping clients navigate anxiety, depression, trauma, and life transitions with evidence-based care.',
    location: 'Vancouver',
    gender: 'Female',
    specialties: ['Anxiety', 'Depression', 'Trauma & PTSD', 'Life Transitions', 'Stress Management'],
    therapyTypes: ['CBT (Cognitive Behavioural Therapy)', 'Psychodynamic Therapy', 'Mindfulness-Based Therapy', 'Person-Centred Therapy'],
    insurances: ['Blue Cross', 'Sun Life', 'Manulife'],
    acceptingNewClients: true,
    sessionFee: '180',
    languages: ['English'],
    yearsExperience: 12,
    phone: '',
    email: '',
    websiteUrl: null,
    isPinned: true,
    userId: null,
  }).onConflictDoNothing();
  app.logger.info('Nancy Brooks insert completed');
}

export function register(app: App, fastify: FastifyInstance) {
  // Seed data on startup
  seedTherapists(app).catch((err) => {
    app.logger.error({ err }, 'Failed to seed therapists');
  });

  fastify.get(
    '/api/therapists',
    {
      schema: {
        description: 'List therapists with optional filters',
        tags: ['therapists'],
        querystring: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'Filter by location' },
            gender: { type: 'string', description: 'Filter by gender' },
            specialty: { type: 'string', description: 'Filter by specialty (array contains)' },
            therapy_type: { type: 'string', description: 'Filter by therapy type (array contains)' },
            insurance: { type: 'string', description: 'Filter by insurance (array contains)' },
            search: { type: 'string', description: 'Search by name or bio (case-insensitive)' },
            sort: { type: 'string', enum: ['price_asc', 'price_desc'], description: 'Sort by session fee' },
          },
        },
        response: {
          200: {
            description: 'List of therapists with total count',
            type: 'object',
            properties: {
              therapists: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    photoUrl: { type: 'string' },
                    title: { type: 'string' },
                    bio: { type: 'string' },
                    location: { type: 'string' },
                    gender: { type: 'string' },
                    specialties: { type: 'array', items: { type: 'string' } },
                    therapyTypes: { type: 'array', items: { type: 'string' } },
                    insurances: { type: 'array', items: { type: 'string' } },
                    acceptingNewClients: { type: 'boolean' },
                    sessionFee: { type: 'string' },
                    languages: { type: 'array', items: { type: 'string' } },
                    yearsExperience: { type: 'integer' },
                    phone: { type: 'string' },
                    email: { type: 'string' },
                    websiteUrl: { type: ['string', 'null'] },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
              total: { type: 'integer' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          location?: string;
          gender?: string;
          specialty?: string;
          therapy_type?: string;
          insurance?: string;
          search?: string;
          sort?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      app.logger.info({ query: request.query }, 'Fetching therapists');

      const conditions = [];

      if (request.query.location) {
        conditions.push(ilike(schema.therapists.location, request.query.location));
      }

      if (request.query.gender) {
        conditions.push(eq(schema.therapists.gender, request.query.gender));
      }

      if (request.query.specialty) {
        conditions.push(sql`${request.query.specialty} = ANY(${schema.therapists.specialties})`);
      }

      if (request.query.therapy_type) {
        conditions.push(sql`${request.query.therapy_type} = ANY(${schema.therapists.therapyTypes})`);
      }

      if (request.query.insurance) {
        conditions.push(sql`${request.query.insurance} = ANY(${schema.therapists.insurances})`);
      }

      if (request.query.search) {
        conditions.push(
          sql`${schema.therapists.name} ILIKE ${'%' + request.query.search + '%'} OR ${schema.therapists.bio} ILIKE ${'%' + request.query.search + '%'}`
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Build query with optional sorting and default ordering by is_pinned and created_at
      const baseQuery = app.db
        .select()
        .from(schema.therapists)
        .where(whereClause);

      const therapists = await (
        request.query.sort === 'price_asc'
          ? baseQuery.orderBy(asc(schema.therapists.sessionFee))
          : request.query.sort === 'price_desc'
          ? baseQuery.orderBy(desc(schema.therapists.sessionFee))
          : baseQuery.orderBy(desc(schema.therapists.isPinned), desc(schema.therapists.createdAt))
      );

      app.logger.info({ count: therapists.length, sort: request.query.sort }, 'Therapists fetched');

      return {
        therapists,
        total: therapists.length,
      };
    }
  );

  fastify.get(
    '/api/therapists/:id',
    {
      schema: {
        description: 'Get a single therapist by ID',
        tags: ['therapists'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid', description: 'Therapist ID' },
          },
        },
        response: {
          200: {
            description: 'Therapist details',
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              photoUrl: { type: 'string' },
              title: { type: 'string' },
              bio: { type: 'string' },
              location: { type: 'string' },
              gender: { type: 'string' },
              specialties: { type: 'array', items: { type: 'string' } },
              therapyTypes: { type: 'array', items: { type: 'string' } },
              insurances: { type: 'array', items: { type: 'string' } },
              acceptingNewClients: { type: 'boolean' },
              sessionFee: { type: 'string' },
              languages: { type: 'array', items: { type: 'string' } },
              yearsExperience: { type: 'integer' },
              phone: { type: 'string' },
              email: { type: 'string' },
              websiteUrl: { type: ['string', 'null'] },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          404: {
            description: 'Therapist not found',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      app.logger.info({ id }, 'Fetching therapist by ID');

      const therapist = await app.db
        .select()
        .from(schema.therapists)
        .where(eq(schema.therapists.id, id))
        .limit(1);

      if (therapist.length === 0) {
        app.logger.info({ id }, 'Therapist not found');
        return reply.status(404).send({ error: 'Therapist not found' });
      }

      app.logger.info({ id }, 'Therapist retrieved successfully');
      return therapist[0];
    }
  );

  fastify.get(
    '/api/filters',
    {
      schema: {
        description: 'Get available filter options',
        tags: ['therapists'],
        response: {
          200: {
            description: 'Filter options',
            type: 'object',
            properties: {
              locations: { type: 'array', items: { type: 'string' } },
              genders: { type: 'array', items: { type: 'string' } },
              specialties: { type: 'array', items: { type: 'string' } },
              therapy_types: { type: 'array', items: { type: 'string' } },
              insurances: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      app.logger.info('Fetching filter options');

      return {
        locations: [
          'Vancouver',
          'Victoria',
          'Kelowna',
          'Surrey',
          'Burnaby',
          'Richmond',
          'Abbotsford',
          'Kamloops',
          'Nanaimo',
          'Prince George',
        ],
        genders: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
        specialties: [
          'Anxiety',
          'Depression',
          'Trauma',
          'PTSD',
          'Grief',
          'Relationships',
          'Addiction',
          'ADHD',
          'OCD',
          'Eating Disorders',
          'Anger Management',
          'Stress',
        ],
        therapy_types: [
          'CBT',
          'DBT',
          'EMDR',
          'Psychodynamic',
          'Mindfulness-Based',
          'Solution-Focused',
          'ACT',
          'Narrative Therapy',
          'Somatic Therapy',
        ],
        insurances: [
          'ICBC',
          'WorkSafeBC',
          'Blue Cross',
          'Sun Life',
          'Manulife',
          'Great-West Life',
          'Desjardins',
          'Self-pay',
        ],
      };
    }
  );
}
