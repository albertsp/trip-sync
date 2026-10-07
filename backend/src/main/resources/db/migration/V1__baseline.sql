-- Baseline: the schema Hibernate generated from the entities up to the AI proposals feature.
-- Existing databases (created by ddl-auto=update) are marked as already at V1 (see spring.flyway.baseline-*),
-- so this script only runs on empty databases.
-- From here on every schema change is a new V<n>__*.sql file: ddl-auto is "validate" and never alters tables.

create sequence availability_seq start with 1 increment by 50;
create table availability (day date, id bigint not null, participant_id uuid, primary key (id), constraint participant_cannot_repeat_day unique (participant_id, day));
create table participant (budget_amount numeric(38,2), created_at timestamp(6), edit_token uuid, id uuid not null, trip_id uuid, notes varchar(200), budget_currency varchar(255) check ((budget_currency in ('EUR','USD'))), destination_type varchar(255) check ((destination_type in ('MOUNTAIN','BEACH','CITY','ROADTRIP','INDIFFERENT'))), name varchar(255), origin_city varchar(255), primary key (id));
create table participant_interests (participant_id uuid not null, interests varchar(255) check ((interests in ('GASTRONOMY','CULTURE','NIGHTLIFE','SPORT','NATURE','RELAX'))), unique (participant_id, interests));
create table proposal_votes (created_at timestamp(6), id uuid not null, participant_id uuid not null, proposal_id uuid not null, trip_id uuid not null, primary key (id), constraint one_vote_per_participant unique (trip_id, participant_id));
create table trip_proposals (best_end date, best_start date, estimated_cost_per_person numeric(38,2), generation integer not null, generation_tokens integer not null, over_budget_count integer not null, plan_generations integer default 0 not null, winner boolean not null, created_at timestamp(6), detail_generated_at timestamp(6), id uuid not null, trip_id uuid not null, detail_payload varchar(30000), payload varchar(30000), angle varchar(255) check ((angle in ('CONSENSUS','BUDGET','AMBITIOUS'))), currency varchar(255), inputs_hash varchar(255), model varchar(255), primary key (id));
create table trip_tasks (done boolean not null, suggested boolean not null, created_at timestamp(6), assignee_id uuid, id uuid not null, trip_id uuid not null, title varchar(255), primary key (id));
create table trips (preferred_duration_days integer, window_end date, window_start date, created_at timestamp(6) not null, creator_id uuid, id uuid not null, status varchar(255) check ((status in ('OPEN','VOTING','CONFIRMED','PLANNING','CLOSED'))), title varchar(255), primary key (id));
create table users (created_at timestamp(6) not null, id uuid not null, email varchar(255), google_id varchar(255) unique, name varchar(255), primary key (id));
create index idx_trip_proposals_trip_generation on trip_proposals (trip_id, generation);
create index idx_trip_tasks_trip on trip_tasks (trip_id);
alter table if exists availability add constraint FK3b1v9s0l8laucctlyvtt4v7j6 foreign key (participant_id) references participant;
alter table if exists participant add constraint FKsumlg4gk6itxtq7313ygsnvls foreign key (trip_id) references trips;
alter table if exists participant_interests add constraint FK448s3fv1vy1unhl3p0f77me97 foreign key (participant_id) references participant;
alter table if exists proposal_votes add constraint FK1hklxrw036lpugi7jqljhct8y foreign key (participant_id) references participant;
alter table if exists proposal_votes add constraint FKhc4pbnlxq4k6v7ncexty3dqif foreign key (proposal_id) references trip_proposals;
alter table if exists proposal_votes add constraint FKlfpjetdkjhgh6ogp6ec3y5aqq foreign key (trip_id) references trips;
alter table if exists trip_proposals add constraint FK9958vvkduk81o5exd2mcfpy5s foreign key (trip_id) references trips;
alter table if exists trip_tasks add constraint FK1djsm8x151puclilykexapba5 foreign key (assignee_id) references participant;
alter table if exists trip_tasks add constraint FKbexgiyoqv416s9kplu5ewd424 foreign key (trip_id) references trips;
alter table if exists trips add constraint FKs35tkrviou21i33n9yuy9ai4q foreign key (creator_id) references users;
