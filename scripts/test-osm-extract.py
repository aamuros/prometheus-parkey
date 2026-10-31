import importlib.util
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET

spec = importlib.util.spec_from_file_location('extract', Path(__file__).with_name('extract-osm-parking.py'))
extractor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extractor)

class ImportTests(unittest.TestCase):
    def test_only_explicit_supported_streets(self):
        root = ET.fromstring('''<osm>
        <node id="1" lon="121.03" lat="14.56"/><node id="2" lon="121.031" lat="14.561"/>
        <way id="3"><nd ref="1"/><nd ref="2"/><tag k="highway" v="residential"/><tag k="parking:both" v="lane"/></way>
        <way id="4"><nd ref="1"/><nd ref="2"/><tag k="highway" v="residential"/><tag k="parking:both" v="no"/></way>
        <way id="5"><nd ref="1"/><nd ref="2"/><tag k="highway" v="residential"/></way>
        <way id="6"><nd ref="1"/><nd ref="2"/><tag k="highway" v="residential"/><tag k="parking:lane:left" v="marked @ (Mo-Fr)"/></way>
        <node id="7" lon="121.03" lat="14.56"><tag k="amenity" v="parking"/><tag k="parking" v="street_side"/></node>
        <node id="8" lon="121.03" lat="14.56"><tag k="amenity" v="parking"/><tag k="access" v="private"/></node>
        </osm>''')
        records = extractor.extract(root, '2026-10-28T00:00:00Z')
        self.assertEqual([r['id'] for r in records], ['osm:way/3'])
        self.assertEqual(records[0]['side'], 'both')
        self.assertIsNone(records[0]['fees'])
        self.assertIsNone(records[0]['hours'])
        self.assertEqual(records[0]['verification'], 'unverified')

if __name__ == '__main__':
    unittest.main()
