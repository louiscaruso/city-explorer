DROP TABLE if exists citylocations;

CREATE TABLE citylocations(
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  latitude VARCHAR(255),
  longitude VARCHAR(255)
);