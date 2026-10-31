"""Extract an attributed pilot snapshot from an OSM API .osm export. No network requests.
Usage: python3 scripts/extract-osm-parking.py export.osm snapshot.json
Only explicit parking tags are imported. Nodes tagged as lane/street_side are
excluded: their point geometry cannot describe a street extent. Relations are
excluded until polygon/member assembly is implemented. All records are unverified.
"""
import datetime
import json
import sys
import xml.etree.ElementTree as ET

WEST, SOUTH, EAST, NORTH = 121.024, 14.558, 121.041, 14.572
ALLOWED = {'lane', 'street_side', 'parallel', 'diagonal', 'perpendicular', 'marked', 'on_street', 'yes'}

def restriction_text(key, value):
    if key == 'access':
        return 'Access recorded by OpenStreetMap: ' + value.replace('_', ' ')
    if key == 'ownership':
        return 'Road ownership recorded by OpenStreetMap: ' + value.replace('_', ' ')
    if key == 'maxstay':
        return 'Maximum stay: ' + value
    parts = key.split(':')
    legacy = parts[1] in ('lane', 'condition')
    side_index = 2 if legacy else 1
    side = {'left': 'left side', 'right': 'right side', 'both': 'both sides'}.get(parts[side_index] if len(parts) > side_index else '', 'side unknown')
    field = ':'.join(parts[side_index + 1:])
    label = {'orientation': 'Parking orientation', 'restriction': 'Restriction', 'maxstay': 'Maximum stay', 'time_interval': 'Restriction times (source notation)'}.get(field)
    if label is None:
        label = 'Restriction' if legacy and parts[1] == 'condition' else 'Mapped parking arrangement'
    return label + ' (' + side + '): ' + value.replace('_', ' ')

def extract(root, observed):
    nodes = {n.get('id'): [float(n.get('lon')), float(n.get('lat'))] for n in root.findall('node')}
    records = []
    for item in root:
        tags = {tag.get('k'): tag.get('v') for tag in item.findall('tag')}
        point = nodes.get(item.get('id')) if item.tag == 'node' else None
        coords = [nodes[n.get('ref')] for n in item.findall('nd') if n.get('ref') in nodes]
        # Never build a line across missing nodes.
        if item.tag == 'way' and len(coords) != len(item.findall('nd')):
            continue
        kind, side, geometry = None, 'unknown', None
        if tags.get('amenity') == 'parking' and item.tag in ('node', 'way'):
            if tags.get('parking') in ('street_side', 'lane') or tags.get('access') in ('private', 'no') or tags.get('building') == 'construction':
                continue
            if point is None and coords:
                # Facility polygons are represented by a point; this is NOT a mapped entrance.
                unique = coords[:-1] if coords[0] == coords[-1] else coords
                point = [sum(p[i] for p in unique) / len(unique) for i in (0, 1)]
            if point is None:
                continue
            kind = 'garage' if tags.get('parking') in ('multi-storey', 'underground') or tags.get('building') == 'parking' else 'lot'
            geometry = {'type': 'Point', 'coordinates': point}
        elif item.tag == 'way' and tags.get('highway') and len(coords) >= 2:
            sides = []
            for direction in ('both', 'left', 'right'):
                value = tags.get('parking:' + direction, tags.get('parking:lane:' + direction, ''))
                # Conditional values need reviewed interpretation; retain them as rules only
                # on otherwise supported records, never infer permission from them.
                restriction = tags.get('parking:' + direction + ':restriction', '')
                if value in ALLOWED and restriction not in ('no_parking', 'no_stopping'):
                    sides.append(direction)
            if not sides:
                continue
            kind = 'street'
            side = 'both' if 'both' in sides or {'left', 'right'}.issubset(sides) else sides[0]
            geometry = {'type': 'LineString', 'coordinates': coords}
            point = coords[len(coords) // 2]
        if not kind or not point or not (WEST <= point[0] <= EAST and SOUTH <= point[1] <= NORTH):
            continue
        url = 'https://www.openstreetmap.org/' + item.tag + '/' + item.get('id')
        rules = {k: v for k, v in tags.items() if k in ('access', 'maxstay', 'restriction', 'ownership') or k.startswith('parking:')}
        regulations = [{'description': restriction_text(k, v), 'sourceLabel': 'OpenStreetMap tags (not independently verified)', 'sourceUrl': url, 'observedAt': observed} for k, v in rules.items()]
        if geometry['type'] == 'Point':
            regulations.append({'description': 'Map point may be a facility centroid, not an entrance. Confirm access on arrival.', 'sourceLabel': 'Parkey import geometry note', 'sourceUrl': url, 'observedAt': observed})
        fees = tags.get('charge') or ('Fee applies; amount unavailable' if tags.get('fee') == 'yes' else 'OSM records no fee; check posted signs' if tags.get('fee') == 'no' else None)
        address = ', '.join(tags[k] for k in ('addr:housenumber', 'addr:street', 'addr:city') if tags.get(k)) or None
        records.append({'id': 'osm:' + item.tag + '/' + item.get('id'), 'name': tags.get('name') or (tags.get('addr:street') + ' parking' if tags.get('addr:street') else 'Unnamed parking · OpenStreetMap') if kind != 'street' else tags.get('name', 'Unnamed street'), 'kind': kind, 'geometry': geometry, 'address': address, 'side': side, 'fees': fees, 'hours': tags.get('opening_hours'), 'regulations': regulations, 'sourceKind': 'osm', 'sourceLabel': '© OpenStreetMap contributors · pilot snapshot', 'sourceUrl': url, 'license': 'Open Database License (ODbL) 1.0', 'sourceUpdatedAt': observed, 'verification': 'unverified', 'verifiedAt': None})
    return sorted(records, key=lambda r: r['id'])

if __name__ == '__main__':
    root = ET.parse(sys.argv[1]).getroot()
    # Download time is a snapshot date, never a field verification date.
    records = extract(root, datetime.datetime.now(datetime.timezone.utc).isoformat())
    with open(sys.argv[2], 'w') as output:
        json.dump(records, output, ensure_ascii=False, indent=2)
        output.write('\n')
    print('Extracted', len(records), 'records;', sum(r['kind'] == 'street' for r in records), 'street segments')
