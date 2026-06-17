


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone,
    "phone" "text",
    "nomewpp" "text",
    "bot_message" "text",
    "user_message" "text",
    "message_type" "text",
    "active" boolean DEFAULT true
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."chat_messages_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."chat_messages_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."chat_messages_id_seq" OWNED BY "public"."chat_messages"."id";



CREATE TABLE IF NOT EXISTS "public"."chats" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone,
    "phone" "text",
    "updated_at" "text"
);


ALTER TABLE "public"."chats" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."chats_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."chats_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."chats_id_seq" OWNED BY "public"."chats"."id";



CREATE TABLE IF NOT EXISTS "public"."dados_cliente" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone,
    "telefone" "text",
    "nomewpp" "text",
    "atendimento_ia" "text",
    "setor" "text"
);


ALTER TABLE "public"."dados_cliente" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."dados_cliente_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."dados_cliente_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."dados_cliente_id_seq" OWNED BY "public"."dados_cliente"."id";



CREATE TABLE IF NOT EXISTS "public"."n8n_chat_histories" (
    "id" integer NOT NULL,
    "session_id" character varying,
    "message" "jsonb"
);


ALTER TABLE "public"."n8n_chat_histories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."n8n_chat_histories_gerente" (
    "id" integer NOT NULL,
    "session_id" character varying,
    "message" "jsonb"
);


ALTER TABLE "public"."n8n_chat_histories_gerente" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."n8n_chat_histories_gerente_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."n8n_chat_histories_gerente_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."n8n_chat_histories_gerente_id_seq" OWNED BY "public"."n8n_chat_histories_gerente"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."n8n_chat_histories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."n8n_chat_histories_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."n8n_chat_histories_id_seq" OWNED BY "public"."n8n_chat_histories"."id";



ALTER TABLE ONLY "public"."chat_messages" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."chat_messages_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."chats" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."chats_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."dados_cliente" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."dados_cliente_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."n8n_chat_histories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."n8n_chat_histories_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."n8n_chat_histories_gerente" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."n8n_chat_histories_gerente_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dados_cliente"
    ADD CONSTRAINT "dados_cliente_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."n8n_chat_histories_gerente"
    ADD CONSTRAINT "n8n_chat_histories_gerente_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."n8n_chat_histories"
    ADD CONSTRAINT "n8n_chat_histories_pkey" PRIMARY KEY ("id");





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";








































































































































































GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON SEQUENCE "public"."chat_messages_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."chat_messages_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."chat_messages_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."chats" TO "anon";
GRANT ALL ON TABLE "public"."chats" TO "authenticated";
GRANT ALL ON TABLE "public"."chats" TO "service_role";



GRANT ALL ON SEQUENCE "public"."chats_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."chats_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."chats_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."dados_cliente" TO "anon";
GRANT ALL ON TABLE "public"."dados_cliente" TO "authenticated";
GRANT ALL ON TABLE "public"."dados_cliente" TO "service_role";



GRANT ALL ON SEQUENCE "public"."dados_cliente_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dados_cliente_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dados_cliente_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."n8n_chat_histories" TO "anon";
GRANT ALL ON TABLE "public"."n8n_chat_histories" TO "authenticated";
GRANT ALL ON TABLE "public"."n8n_chat_histories" TO "service_role";



GRANT ALL ON TABLE "public"."n8n_chat_histories_gerente" TO "anon";
GRANT ALL ON TABLE "public"."n8n_chat_histories_gerente" TO "authenticated";
GRANT ALL ON TABLE "public"."n8n_chat_histories_gerente" TO "service_role";



GRANT ALL ON SEQUENCE "public"."n8n_chat_histories_gerente_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."n8n_chat_histories_gerente_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."n8n_chat_histories_gerente_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."n8n_chat_histories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."n8n_chat_histories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."n8n_chat_histories_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


