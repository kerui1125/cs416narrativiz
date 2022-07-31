import certifi
import copy
import csv
import geopy
import json
import ssl

RAW_DATA_PATH = "us_cs_faculty_raw_data.csv"
OUTPUT_CSV_PATH = "csv_generated/us_cs_faculty.csv"


def get_professor_name(raw_data: str) -> str:
    return raw_data.strip()


def get_university_name(raw_data: str) -> str:
    return json.loads(raw_data)["name"]


def get_position_name(raw_data: str) -> str:
    if not raw_data:
        return ""
    if "Dean" in raw_data or "Chair" in raw_data or "Director" in raw_data:
        return "Director"
    if "Distinguished Professor" in raw_data or "DistinguishedProfessor" in raw_data:
        return "Distinguished Professor"
    if "Professor" in raw_data and \
            "Associate Professor" not in raw_data and \
            "AssociateProfessor" not in raw_data and \
            "Assistant Professor" not in raw_data and \
            "AssistantProfessor" not in raw_data and \
            "Distinguished Professor" not in raw_data:
        return "Professor"
    if "Associate Professor" in raw_data or "AssociateProfessor" in raw_data:
        return "Associate Professor"
    if "Assistant Professor" in raw_data or "AssistantProfessor" in raw_data:
        return "Assistant Professor"
    if "Lecturer" in raw_data:
        return "Lecturer"
    return "Other"


def read_raw_data() -> dict:
    output = {}
    check_duplicate_data = {}
    with open(RAW_DATA_PATH, "r") as f:
        reader = csv.reader(f)
        for i, row in enumerate(reader):
            if i == 0:
                continue

            positions = {
                "Director": 0,
                "Distinguished Professor": 0,
                "Professor": 0,
                "Associate Professor": 0,
                "Assistant Professor": 0,
                "Lecturer": 0,
                "Other": 0
            }

            professor, position, affiliation, _, _ = row
            professor = get_professor_name(professor)
            university = get_university_name(affiliation)
            position = get_position_name(position)
            if not position:
                continue

            if university not in check_duplicate_data:
                check_duplicate_data[university] = set()
            else:
                if professor in check_duplicate_data[university]:
                    continue
            check_duplicate_data[university].add(professor)

            if university not in output:
                output[university] = {"positions": copy.deepcopy(positions)}
            output[university]["positions"][position] += 1

    return output


def get_university_geo_data(university_name: str) -> tuple:
    ctx = ssl.create_default_context(cafile=certifi.where())
    geopy.geocoders.options.default_ssl_context = ctx
    locator = geopy.geocoders.ArcGIS(user_agent="UIUC_CS416_Kerui")
    location = locator.geocode(university_name, timeout=10)
    return location.latitude, location.longitude


def write_processed_data(data: dict) -> None:
    with open(OUTPUT_CSV_PATH, "w") as f:
        writer = csv.writer(f)
        writer.writerow(
            ["University", "Director", "Distinguished Professor", "Professor",
             "Associate Professor", "Assistant Professor", "Lecturer", "Other",
             "Total", "Lat", "Lon"]
        )
        for university, data in data.items():
            lat, lon = get_university_geo_data(university)
            writer.writerow([
                university,
                data["positions"]["Director"],
                data["positions"]["Distinguished Professor"],
                data["positions"]["Professor"],
                data["positions"]["Associate Professor"],
                data["positions"]["Assistant Professor"],
                data["positions"]["Lecturer"],
                data["positions"]["Other"],
                sum(data["positions"].values()),
                lat,
                lon
            ])


if __name__ == "__main__":
    write_processed_data(read_raw_data())
