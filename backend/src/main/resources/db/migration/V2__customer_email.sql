-- Customer email address, used to deliver collection reminders.
alter table customers add column email varchar(255);
