--
-- PostgreSQL database dump
--

\restrict Dody8epunx9hi0vdbRwCas6cI3feVz4MGX64bkoE8eb7IXPwRtDVXPbYDllZYKU

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

\unrestrict Dody8epunx9hi0vdbRwCas6cI3feVz4MGX64bkoE8eb7IXPwRtDVXPbYDllZYKU

