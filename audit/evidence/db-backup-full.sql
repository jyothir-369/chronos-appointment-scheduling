--
-- PostgreSQL database dump
--

\restrict u0fqLklopGwQwLxH8qb3X8OlM8nCLs8uWci25plekd9LSwiubriFmogD0HzIaBx

-- Dumped from database version 13.22
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- Name: SlotStatus; Type: TYPE; Schema: public; Owner: chronos
--

CREATE TYPE public."SlotStatus" AS ENUM (
    'open',
    'booked',
    'blocked'
);


ALTER TYPE public."SlotStatus" OWNER TO chronos;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: availability_rules; Type: TABLE; Schema: public; Owner: chronos
--

CREATE TABLE public.availability_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id uuid NOT NULL,
    day_of_week smallint NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    CONSTRAINT availability_rules_check CHECK ((end_time > start_time)),
    CONSTRAINT availability_rules_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7)))
);


ALTER TABLE public.availability_rules OWNER TO chronos;

--
-- Name: blocked_periods; Type: TABLE; Schema: public; Owner: chronos
--

CREATE TABLE public.blocked_periods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id uuid NOT NULL,
    range_start_utc timestamp with time zone NOT NULL,
    range_end_utc timestamp with time zone NOT NULL,
    reason character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT blocked_period_end_after_start CHECK ((range_end_utc > range_start_utc))
);


ALTER TABLE public.blocked_periods OWNER TO chronos;

--
-- Name: bookings; Type: TABLE; Schema: public; Owner: chronos
--

CREATE TABLE public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slot_id uuid NOT NULL,
    client_id uuid NOT NULL,
    client_timezone text NOT NULL,
    status text DEFAULT 'booked'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    cancelled_at timestamp with time zone,
    provider_id uuid,
    event_type_id uuid,
    updated_at timestamp with time zone DEFAULT now(),
    notes text,
    client_notes text,
    CONSTRAINT bookings_status_check CHECK ((status = ANY (ARRAY['booked'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text])))
);


ALTER TABLE public.bookings OWNER TO chronos;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: chronos
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    company character varying,
    phone character varying,
    avatar_url character varying
);


ALTER TABLE public.clients OWNER TO chronos;

--
-- Name: event_types; Type: TABLE; Schema: public; Owner: chronos
--

CREATE TABLE public.event_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id uuid NOT NULL,
    title character varying NOT NULL,
    duration_minutes integer NOT NULL,
    price double precision,
    location character varying,
    slug character varying NOT NULL,
    description character varying,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone
);


ALTER TABLE public.event_types OWNER TO chronos;

--
-- Name: idempotency_keys; Type: TABLE; Schema: public; Owner: chronos
--

CREATE TABLE public.idempotency_keys (
    client_id uuid NOT NULL,
    key text NOT NULL,
    request_hash text NOT NULL,
    response_status integer,
    response_body jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.idempotency_keys OWNER TO chronos;

--
-- Name: providers; Type: TABLE; Schema: public; Owner: chronos
--

CREATE TABLE public.providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    timezone text NOT NULL,
    slot_minutes integer DEFAULT 30 NOT NULL,
    cancellation_window_hours integer DEFAULT 24 NOT NULL,
    reminder_offsets_minutes integer[] DEFAULT '{1440,60}'::integer[] NOT NULL,
    slug character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    CONSTRAINT providers_cancellation_window_hours_check CHECK ((cancellation_window_hours >= 0)),
    CONSTRAINT providers_slot_minutes_check CHECK (((slot_minutes >= 5) AND (slot_minutes <= 240)))
);


ALTER TABLE public.providers OWNER TO chronos;

--
-- Name: reminder_jobs; Type: TABLE; Schema: public; Owner: chronos
--

CREATE TABLE public.reminder_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    offset_minutes integer NOT NULL,
    fire_at_utc timestamp with time zone NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    sent_at timestamp with time zone,
    provider_message_id text,
    last_error text,
    CONSTRAINT reminder_jobs_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'sending'::text, 'sent'::text, 'cancelled'::text, 'skipped'::text, 'failed'::text])))
);


ALTER TABLE public.reminder_jobs OWNER TO chronos;

--
-- Name: services; Type: TABLE; Schema: public; Owner: chronos
--

CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    duration_minutes integer NOT NULL,
    buffer_minutes integer DEFAULT 0 NOT NULL,
    price_cents integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT services_buffer_minutes_check CHECK ((buffer_minutes >= 0)),
    CONSTRAINT services_duration_minutes_check CHECK (((duration_minutes >= 5) AND (duration_minutes <= 240)))
);


ALTER TABLE public.services OWNER TO chronos;

--
-- Name: slots; Type: TABLE; Schema: public; Owner: chronos
--

CREATE TABLE public.slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id uuid NOT NULL,
    slot_start_utc timestamp with time zone NOT NULL,
    slot_end_utc timestamp with time zone NOT NULL,
    display_tz text NOT NULL,
    status text DEFAULT 'open'::public."SlotStatus" NOT NULL,
    service_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT slots_end_after_start CHECK ((slot_end_utc > slot_start_utc))
);


ALTER TABLE public.slots OWNER TO chronos;

--
-- Name: waitlist_entries; Type: TABLE; Schema: public; Owner: chronos
--

CREATE TABLE public.waitlist_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id uuid NOT NULL,
    client_id uuid NOT NULL,
    desired_date date NOT NULL,
    desired_service_id uuid,
    notified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.waitlist_entries OWNER TO chronos;

--
-- Data for Name: availability_rules; Type: TABLE DATA; Schema: public; Owner: chronos
--

COPY public.availability_rules (id, provider_id, day_of_week, start_time, end_time) FROM stdin;
c813ddb6-30f7-49ed-8c9a-5b6ecaa2cde8	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	1	09:00:00	17:00:00
8db68d63-fed1-4ef4-815d-9b0ab4ded36f	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	3	09:00:00	17:00:00
32a94ccc-db85-4311-9919-f3d398bf0bb8	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	5	09:00:00	12:00:00
39c93a3a-f4df-4db3-bfed-7ec30801db0e	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	1	09:00:00	17:00:00
8293270f-2f52-4e93-885e-a5459d022a28	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	3	09:00:00	17:00:00
6b99a929-68b5-4240-b7ac-c54561d8a9d9	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	5	09:00:00	12:00:00
8a3e6d68-1336-4f40-8c63-f2f063b5a713	9dac48f4-84d7-4a15-918f-4e2f7a3855ca	1	09:00:00	17:00:00
\.


--
-- Data for Name: blocked_periods; Type: TABLE DATA; Schema: public; Owner: chronos
--

COPY public.blocked_periods (id, provider_id, range_start_utc, range_end_utc, reason, created_at) FROM stdin;
\.


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: chronos
--

COPY public.bookings (id, slot_id, client_id, client_timezone, status, version, created_at, cancelled_at, provider_id, event_type_id, updated_at, notes, client_notes) FROM stdin;
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: chronos
--

COPY public.clients (id, email, name, created_at, updated_at, company, phone, avatar_url) FROM stdin;
b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21	client@example.com	Test Client	2026-10-05 10:28:13.712803+05:30	2026-10-05 10:28:13.712803+05:30	\N	\N	\N
7e576f61-a5c3-491e-a6ba-18fe4bb317c9	t@t.t	T	2026-10-05 11:26:31.485+05:30	2026-10-05 11:26:31.485+05:30	\N	\N	\N
7b0c1835-653a-483e-a4c3-7aed6bd10114	t-1791181161153@t.t	T	2026-10-05 11:49:21.154+05:30	2026-10-05 11:49:21.154+05:30	\N	\N	\N
\.


--
-- Data for Name: event_types; Type: TABLE DATA; Schema: public; Owner: chronos
--

COPY public.event_types (id, provider_id, title, duration_minutes, price, location, slug, description, active, created_at, updated_at) FROM stdin;
2b5804e9-d19c-4971-9a85-7caba70ce5e1	e20f82ea-5353-439e-9cc1-0894170983c8	E	30	100	\N	e-1791179791478	\N	t	2026-10-05 11:26:31.479+05:30	2026-10-05 11:26:31.479+05:30
0450d637-9f64-4e2b-afc2-8c7d48852fcc	a0bb0ee7-3c71-4607-a102-b8bab3767a6c	E	30	\N	\N	e-1791181136962	\N	t	2026-10-05 11:48:56.963+05:30	2026-10-05 11:48:56.963+05:30
8fc5786d-4a38-4a53-8ee7-03bf48f5fe66	f8ff509d-e1c2-4443-ae4d-b70cf72328bf	E	30	\N	\N	e-1791181161149	\N	t	2026-10-05 11:49:21.15+05:30	2026-10-05 11:49:21.15+05:30
\.


--
-- Data for Name: idempotency_keys; Type: TABLE DATA; Schema: public; Owner: chronos
--

COPY public.idempotency_keys (client_id, key, request_hash, response_status, response_body, created_at) FROM stdin;
b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21	v2-test	{"slotId":"db93e33f-9c9a-4a53-bd2b-0b06ff59e9a6","clientId":"b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21","idempotencyKey":"v2-test","clientTimezone":"UTC"}	201	{"bookingId": "17b4d220-ffba-4489-a875-4516de997909"}	2026-09-25 10:19:15.913761+05:30
b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21	cancel-test-1	{"slotId":"db93e33f-9c9a-4a53-bd2b-0b06ff59e9a6","clientId":"b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21","idempotencyKey":"cancel-test-1","clientTimezone":"UTC"}	201	{"bookingId": "3c76d903-1bc4-4ca0-b17a-fb26e90db668"}	2026-09-25 10:20:05.14495+05:30
b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21	final-curl-proof	{"slotId":"60f06d8f-81b3-4e68-a10c-08831468b8d1","clientId":"b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21","idempotencyKey":"final-curl-proof","clientTimezone":"UTC"}	201	{"bookingId": "ad8b1bdc-5120-4b3f-b7c8-da15d403b0ba"}	2026-09-25 10:20:51.226456+05:30
b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21	e2e-final-001	{"slotId":"929f8075-2f8e-49ae-80f7-80c5547fd367","clientId":"b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21","idempotencyKey":"e2e-final-001","clientTimezone":"UTC"}	201	{"bookingId": "df070a3b-f907-4300-893b-9a48c62510c0"}	2026-09-25 10:24:14.069846+05:30
\.


--
-- Data for Name: providers; Type: TABLE DATA; Schema: public; Owner: chronos
--

COPY public.providers (id, name, timezone, slot_minutes, cancellation_window_hours, reminder_offsets_minutes, slug, created_at, updated_at) FROM stdin;
a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	Dr. Chronos Test Provider	America/New_York	30	24	{1440,60}	provider-a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-05 10:27:20.601368+05:30	\N
9dac48f4-84d7-4a15-918f-4e2f7a3855ca	Dr. Chronos	America/New_York	30	24	{1440,60}	provider-9dac48f4-84d7-4a15-918f-4e2f7a3855ca	2026-10-05 10:27:20.601368+05:30	\N
e20f82ea-5353-439e-9cc1-0894170983c8	E2E-T	America/New_York	30	24	{1440,60}	e2e-t-1791179791423	2026-10-05 11:26:31.473+05:30	2026-10-05 11:26:31.473+05:30
a0bb0ee7-3c71-4607-a102-b8bab3767a6c	T	UTC	30	24	{1440,60}	t-1791181136923	2026-10-05 11:48:56.957+05:30	2026-10-05 11:48:56.957+05:30
f8ff509d-e1c2-4443-ae4d-b70cf72328bf	TEST-1791181161108	UTC	30	24	{1440,60}	test-1791181161108	2026-10-05 11:49:21.145+05:30	2026-10-05 11:49:21.145+05:30
\.


--
-- Data for Name: reminder_jobs; Type: TABLE DATA; Schema: public; Owner: chronos
--

COPY public.reminder_jobs (id, booking_id, offset_minutes, fire_at_utc, status, attempts, locked_until, sent_at, provider_message_id, last_error) FROM stdin;
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: chronos
--

COPY public.services (id, provider_id, name, duration_minutes, buffer_minutes, price_cents, created_at) FROM stdin;
\.


--
-- Data for Name: slots; Type: TABLE DATA; Schema: public; Owner: chronos
--

COPY public.slots (id, provider_id, slot_start_utc, slot_end_utc, display_tz, status, service_id, created_at, updated_at) FROM stdin;
ec3e5f86-c7b0-4cd8-baa9-3c7e72125bee	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-05 07:00:00+05:30	2026-10-05 07:30:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
bc837e5e-7a9a-44fc-baa3-dd7a46150253	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-07 12:00:00+05:30	2026-10-07 12:30:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
94245743-8a89-4eb4-8542-8d4107f8bb57	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-07 12:30:00+05:30	2026-10-07 13:00:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
ec74d6d7-1454-4769-95ad-5919663700d9	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-09 05:00:00+05:30	2026-10-09 05:30:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
309fe132-d9e9-4093-a56c-c25592ec3ea4	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-09 06:00:00+05:30	2026-10-09 06:30:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
11511ff6-b93c-48ee-81d9-8a103bf112f2	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-09 06:30:00+05:30	2026-10-09 07:00:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
abdc9f58-dd66-424a-a6e6-0be484dd82ca	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-09 07:00:00+05:30	2026-10-09 07:30:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
b05adec8-3548-4cfe-b4b3-39f26979f2b8	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-09 07:30:00+05:30	2026-10-09 08:00:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
d68fb52a-5733-477e-93e9-632a61608572	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-09 08:00:00+05:30	2026-10-09 08:30:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
4874c291-1f57-4ae5-9896-1103e3febb51	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-09 08:30:00+05:30	2026-10-09 09:00:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
4834a302-f794-4543-b2c4-e229b4c5556e	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-09 09:00:00+05:30	2026-10-09 09:30:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
ea542d7a-871d-4ef4-a440-8914609fb631	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-09 09:30:00+05:30	2026-10-09 10:00:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
7ce1bc1f-0ca0-4374-b125-270063c37ce1	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-09 10:00:00+05:30	2026-10-09 10:30:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
f04ff1f6-75fe-4b21-9df4-fe68e462eb20	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-09 10:30:00+05:30	2026-10-09 11:00:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
7f823d21-e9f3-47ac-b8fb-d7a174374908	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-09 11:00:00+05:30	2026-10-09 11:30:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
299e10b4-2033-43e8-8dd9-7610f25418be	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-09 11:30:00+05:30	2026-10-09 12:00:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
8bea5f28-703b-4895-a91b-ee5ce6ba9892	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-02 10:00:00+05:30	2026-10-02 10:30:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
a254e7e4-3340-433f-83bb-0fffcd8987c1	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-02 10:30:00+05:30	2026-10-02 11:00:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
0d6fa6cf-d20e-4ec2-86c8-0bea5ad3c117	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-02 11:00:00+05:30	2026-10-02 11:30:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
e41c8a97-f7cc-4e43-b660-cef44fa8daa2	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-02 11:30:00+05:30	2026-10-02 12:00:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
8c3349c9-0f46-4e89-8eab-db92c6e43d41	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-02 12:00:00+05:30	2026-10-02 12:30:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
0ffd0acd-e0dd-410a-b1fc-7108173e4d5c	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-02 12:30:00+05:30	2026-10-02 13:00:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
17bd71de-5bd5-4226-bb9a-fbd845b731a8	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-05 05:00:00+05:30	2026-10-05 05:30:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
2a6f9ac9-cdb4-4673-a0eb-64788c849972	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-05 05:30:00+05:30	2026-10-05 06:00:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
8c3f319d-d6ca-482a-a85a-805db3e36cd2	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-05 06:30:00+05:30	2026-10-05 07:00:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
0aafeb3f-ae1e-4af7-badb-209a55503cea	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-09 12:00:00+05:30	2026-10-09 12:30:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
ce244f60-8d34-42f7-b361-d475dd9d1c45	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-09 12:30:00+05:30	2026-10-09 13:00:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
04e319fe-80df-4afe-ad58-ee008daf0e6f	9dac48f4-84d7-4a15-918f-4e2f7a3855ca	2026-10-04 21:35:08.826085+05:30	2026-10-04 22:35:08.826085+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
64b1a262-ae8a-4166-bb2a-a9bee3a7d1de	9dac48f4-84d7-4a15-918f-4e2f7a3855ca	2026-12-01 15:30:00+05:30	2026-12-01 16:30:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
7b8ec462-0251-42b8-b56a-5e499d95862c	9dac48f4-84d7-4a15-918f-4e2f7a3855ca	2026-12-10 19:30:00+05:30	2026-12-10 20:30:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
198a8421-2114-4d70-a0ef-83fc3fca00a3	9dac48f4-84d7-4a15-918f-4e2f7a3855ca	2026-10-05 21:50:43.785145+05:30	2026-10-05 22:50:43.785145+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
979a70f9-ebb3-43d9-9b3d-cc42a8a83489	f8ff509d-e1c2-4443-ae4d-b70cf72328bf	2026-10-05 11:49:21.155+05:30	2026-10-05 12:19:21.155+05:30	UTC	open	\N	2026-10-05 11:49:21.15733+05:30	2026-10-05 11:49:21.15733+05:30
0394cbd0-f939-4290-b0a7-f9d665cf87fb	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-05 07:30:00+05:30	2026-10-05 08:00:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
a074a0f6-690f-40f0-822f-0b936cb69aee	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-05 08:00:00+05:30	2026-10-05 08:30:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
b1e9bf3d-93ea-4a5b-a9b2-1605e9c89557	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-05 08:30:00+05:30	2026-10-05 09:00:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
da657f4f-5450-48bb-8972-27cdb3fac9c2	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-05 09:00:00+05:30	2026-10-05 09:30:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
ab00cae4-eecb-4c80-aed6-a4dbf74db47c	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-05 09:30:00+05:30	2026-10-05 10:00:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
ffb72638-f50b-4cb0-be4b-c2a8f48be20e	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-05 10:00:00+05:30	2026-10-05 10:30:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
409c380e-0efa-4020-902d-904d97188894	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-05 10:30:00+05:30	2026-10-05 11:00:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
204d8cc6-bf48-4877-89d2-00fe2a8af4e2	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-05 11:00:00+05:30	2026-10-05 11:30:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
19d407dd-cec4-461a-893f-2f7747504de7	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-05 11:30:00+05:30	2026-10-05 12:00:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
186cf87c-30ca-4195-bda4-65c3e87b1c19	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-05 12:00:00+05:30	2026-10-05 12:30:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
bd842a05-b87e-412e-8c87-6ac1c97cdf39	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-05 12:30:00+05:30	2026-10-05 13:00:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
637dce09-7b88-4793-bc2b-6e32aa47dec4	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-07 05:00:00+05:30	2026-10-07 05:30:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
a5e1503c-8551-47ac-9e57-482c343f4bd5	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-07 05:30:00+05:30	2026-10-07 06:00:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
b2fe5995-ecfb-4df7-bc85-97ead76ed505	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-07 06:00:00+05:30	2026-10-07 06:30:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
50f6e939-73b1-4790-96f8-2f34f6cd88a8	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-07 06:30:00+05:30	2026-10-07 07:00:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
7e11beeb-a490-4b4b-aa72-806ad30e18d9	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-07 07:00:00+05:30	2026-10-07 07:30:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
078c314e-a99e-4b52-824a-fe81ffc04325	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-07 07:30:00+05:30	2026-10-07 08:00:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
21d03304-ca11-4871-82be-f45df4da2954	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-07 08:00:00+05:30	2026-10-07 08:30:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
7e10f82a-dce0-4fbd-836c-5839f1411d55	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-07 08:30:00+05:30	2026-10-07 09:00:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
72660efb-0161-4145-b109-4a438877e559	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-07 09:00:00+05:30	2026-10-07 09:30:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
df72c5b4-2fc8-472d-992b-18e2cb1e5cee	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-07 09:30:00+05:30	2026-10-07 10:00:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
2c7dba84-1ebe-4e49-b8ae-746579add70f	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-07 10:00:00+05:30	2026-10-07 10:30:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
6a69d414-59ed-4f07-856e-b79105bcc096	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-07 10:30:00+05:30	2026-10-07 11:00:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
8d0e6233-0cff-4fbd-bfc0-3416bb4861e4	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-07 11:00:00+05:30	2026-10-07 11:30:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
bb21dc8e-dc33-45c9-82b9-0a8bdee09b83	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-07 11:30:00+05:30	2026-10-07 12:00:00+05:30	America/New_York	open	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
ab8be743-af17-4651-bb9c-0193031d4568	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-09-30 08:00:00+05:30	2026-09-30 08:30:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
8435328a-168a-4c68-8326-e112599ad8f7	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-09-30 08:30:00+05:30	2026-09-30 09:00:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
002ae314-c3c0-4246-807a-995856296f03	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-09-30 09:00:00+05:30	2026-09-30 09:30:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
518a46bb-93e8-4232-af6f-e9b46a204aa8	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-09-30 09:30:00+05:30	2026-09-30 10:00:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
3dfc2bdd-c2fb-41db-9f09-773f1b8b6b41	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-09-30 10:00:00+05:30	2026-09-30 10:30:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
0f1cb32f-136f-4eff-8912-964e7859cd54	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-09-30 10:30:00+05:30	2026-09-30 11:00:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
0f7a6ad7-f42f-40a5-be14-8c25f5adc93b	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-09-30 11:00:00+05:30	2026-09-30 11:30:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
330616cd-b505-4592-81a0-1f29d21ebe41	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-09-30 11:30:00+05:30	2026-09-30 12:00:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
c4c742c3-cca1-495c-9b09-514e38295080	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-09-30 05:00:00+05:30	2026-09-30 05:30:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
72d903ec-d789-4afd-a54f-056bf89eb60d	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-09-30 12:00:00+05:30	2026-09-30 12:30:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
e3006687-c9f5-4a19-ae43-ce89ed806dec	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-09-30 12:30:00+05:30	2026-09-30 13:00:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
8a051d99-669d-4714-a749-df62f9ed8915	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-02 05:00:00+05:30	2026-10-02 05:30:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
d237142d-8086-4c2c-b6a2-fd641973b560	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-05 06:00:00+05:30	2026-10-05 06:30:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
971192f6-211c-4d89-967a-ebd026ab710c	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-02 05:30:00+05:30	2026-10-02 06:00:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
968415cd-d83f-4e29-8b47-dc1e7119a1e6	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-02 06:00:00+05:30	2026-10-02 06:30:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
a18932c4-b5bf-4613-8804-2bdad9b69f08	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-09 05:30:00+05:30	2026-10-09 06:00:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
dee02cfd-e452-454b-a838-a3166d65db4e	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-09-30 05:30:00+05:30	2026-09-30 06:00:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
22c87c6b-b316-48cd-a6d6-4512df153a1a	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-09-30 06:00:00+05:30	2026-09-30 06:30:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
8383616f-b4b8-484a-90b7-1f11a21aa1af	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-09-30 06:30:00+05:30	2026-09-30 07:00:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
59a4ddfe-5746-437a-810b-aa476f3a115a	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-09-30 07:00:00+05:30	2026-09-30 07:30:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
6c12d2f0-44a3-4037-8898-f55e5aa8c15c	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-02 06:30:00+05:30	2026-10-02 07:00:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
d50d341a-f6f3-4f6a-848e-65a073e6d3eb	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-02 07:00:00+05:30	2026-10-02 07:30:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
b6f1e7db-3ee0-4a8f-99dc-27b440b3bccc	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-02 07:30:00+05:30	2026-10-02 08:00:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
a24cd867-7fbb-42ed-9eb1-3aa6ac0f9aef	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-02 08:00:00+05:30	2026-10-02 08:30:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
e38e597e-d303-4d03-8f01-e385b5edd325	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-09-30 07:30:00+05:30	2026-09-30 08:00:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
6ef09804-4780-4bc1-aeec-cae004be8eb5	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-02 08:30:00+05:30	2026-10-02 09:00:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
4f44f92b-82eb-414a-b25f-03695f22bcbd	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-02 09:00:00+05:30	2026-10-02 09:30:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
972cdb4a-0e2f-4b28-b704-8ee35cafe8e6	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-10-02 09:30:00+05:30	2026-10-02 10:00:00+05:30	America/New_York	booked	\N	2026-10-05 10:29:06.828762+05:30	2026-10-05 10:29:06.828762+05:30
\.


--
-- Data for Name: waitlist_entries; Type: TABLE DATA; Schema: public; Owner: chronos
--

COPY public.waitlist_entries (id, provider_id, client_id, desired_date, desired_service_id, notified_at, created_at) FROM stdin;
\.


--
-- Name: availability_rules availability_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.availability_rules
    ADD CONSTRAINT availability_rules_pkey PRIMARY KEY (id);


--
-- Name: blocked_periods blocked_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.blocked_periods
    ADD CONSTRAINT blocked_periods_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: clients clients_email_key; Type: CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_email_key UNIQUE (email);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: event_types event_types_pkey; Type: CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.event_types
    ADD CONSTRAINT event_types_pkey PRIMARY KEY (id);


--
-- Name: event_types event_types_slug_key; Type: CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.event_types
    ADD CONSTRAINT event_types_slug_key UNIQUE (slug);


--
-- Name: idempotency_keys idempotency_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_pkey PRIMARY KEY (client_id, key);


--
-- Name: providers providers_pkey; Type: CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.providers
    ADD CONSTRAINT providers_pkey PRIMARY KEY (id);


--
-- Name: reminder_jobs reminder_jobs_booking_id_offset_minutes_key; Type: CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.reminder_jobs
    ADD CONSTRAINT reminder_jobs_booking_id_offset_minutes_key UNIQUE (booking_id, offset_minutes);


--
-- Name: reminder_jobs reminder_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.reminder_jobs
    ADD CONSTRAINT reminder_jobs_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: slots slots_no_overlap; Type: CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.slots
    ADD CONSTRAINT slots_no_overlap EXCLUDE USING gist (provider_id WITH =, tstzrange(slot_start_utc, slot_end_utc, '[)'::text) WITH &&);


--
-- Name: slots slots_pkey; Type: CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.slots
    ADD CONSTRAINT slots_pkey PRIMARY KEY (id);


--
-- Name: slots slots_provider_start_uniq; Type: CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.slots
    ADD CONSTRAINT slots_provider_start_uniq UNIQUE (provider_id, slot_start_utc);


--
-- Name: waitlist_entries waitlist_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.waitlist_entries
    ADD CONSTRAINT waitlist_entries_pkey PRIMARY KEY (id);


--
-- Name: blocked_periods_provider_range_idx; Type: INDEX; Schema: public; Owner: chronos
--

CREATE INDEX blocked_periods_provider_range_idx ON public.blocked_periods USING btree (provider_id, range_start_utc, range_end_utc);


--
-- Name: bookings_one_live_per_slot; Type: INDEX; Schema: public; Owner: chronos
--

CREATE UNIQUE INDEX bookings_one_live_per_slot ON public.bookings USING btree (slot_id) WHERE (status <> 'cancelled'::text);


--
-- Name: idx_bookings_client_id; Type: INDEX; Schema: public; Owner: chronos
--

CREATE INDEX idx_bookings_client_id ON public.bookings USING btree (client_id);


--
-- Name: idx_bookings_event_type_id; Type: INDEX; Schema: public; Owner: chronos
--

CREATE INDEX idx_bookings_event_type_id ON public.bookings USING btree (event_type_id);


--
-- Name: idx_bookings_provider_id; Type: INDEX; Schema: public; Owner: chronos
--

CREATE INDEX idx_bookings_provider_id ON public.bookings USING btree (provider_id);


--
-- Name: idx_event_types_provider_id; Type: INDEX; Schema: public; Owner: chronos
--

CREATE INDEX idx_event_types_provider_id ON public.event_types USING btree (provider_id);


--
-- Name: idx_event_types_slug; Type: INDEX; Schema: public; Owner: chronos
--

CREATE UNIQUE INDEX idx_event_types_slug ON public.event_types USING btree (slug);


--
-- Name: idx_providers_slug; Type: INDEX; Schema: public; Owner: chronos
--

CREATE UNIQUE INDEX idx_providers_slug ON public.providers USING btree (slug);


--
-- Name: reminder_due_idx; Type: INDEX; Schema: public; Owner: chronos
--

CREATE INDEX reminder_due_idx ON public.reminder_jobs USING btree (fire_at_utc) WHERE (status = ANY (ARRAY['scheduled'::text, 'sending'::text]));


--
-- Name: slots_open_idx; Type: INDEX; Schema: public; Owner: chronos
--

CREATE INDEX slots_open_idx ON public.slots USING btree (provider_id, slot_start_utc) WHERE (status = 'open'::text);


--
-- Name: waitlist_provider_date_idx; Type: INDEX; Schema: public; Owner: chronos
--

CREATE INDEX waitlist_provider_date_idx ON public.waitlist_entries USING btree (provider_id, desired_date);


--
-- Name: availability_rules availability_rules_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.availability_rules
    ADD CONSTRAINT availability_rules_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;


--
-- Name: blocked_periods blocked_periods_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.blocked_periods
    ADD CONSTRAINT blocked_periods_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.slots(id) ON DELETE CASCADE;


--
-- Name: event_types event_types_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.event_types
    ADD CONSTRAINT event_types_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;


--
-- Name: idempotency_keys idempotency_keys_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: reminder_jobs reminder_jobs_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.reminder_jobs
    ADD CONSTRAINT reminder_jobs_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: services services_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;


--
-- Name: slots slots_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.slots
    ADD CONSTRAINT slots_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;


--
-- Name: slots slots_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.slots
    ADD CONSTRAINT slots_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;


--
-- Name: waitlist_entries waitlist_entries_desired_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.waitlist_entries
    ADD CONSTRAINT waitlist_entries_desired_service_id_fkey FOREIGN KEY (desired_service_id) REFERENCES public.services(id) ON DELETE SET NULL;


--
-- Name: waitlist_entries waitlist_entries_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chronos
--

ALTER TABLE ONLY public.waitlist_entries
    ADD CONSTRAINT waitlist_entries_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict u0fqLklopGwQwLxH8qb3X8OlM8nCLs8uWci25plekd9LSwiubriFmogD0HzIaBx

