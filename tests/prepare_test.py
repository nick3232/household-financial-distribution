"""Regression checks, including a synthetic signed fixture (never used as app data)."""
import csv
import io
import json
from pathlib import Path
import sys
import unittest
import zipfile
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from prepare_us_scf import prepare

class PreparationTests(unittest.TestCase):
    def archive(self, value='-100'):
        output=io.BytesIO()
        with zipfile.ZipFile(output,'w') as z:
            z.writestr('SCFP2025.csv','YY1,Y1,WGT,FIN,INCOME\n'+''.join(f'{h},{h*10+i},1,0,{value if h==1 else 0}\n' for h in (1,2) for i in range(1,6)))
        return output.getvalue()
    def test_signed_income(self):
        d=prepare(self.archive(),'INCOME')
        self.assertEqual(d['points'],[[-100.0,.5],[0.0,1.0]])
        self.assertEqual(d['thresholds']['50'],-100)
    def test_missing_rejected(self):
        with self.assertRaises(ValueError):prepare(self.archive(''),'INCOME')
    def test_nonfinite_rejected(self):
        with self.assertRaises(ValueError):prepare(self.archive('nan'),'INCOME')

if __name__=='__main__':unittest.main()
