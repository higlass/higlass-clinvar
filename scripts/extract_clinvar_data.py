
#pip install PyVCF
import vcf
import csv

from random import seed
from random import random

# Input/Output file names (need to be in same folder)
# Clinvar file
clinvar_file = 'clinvar_20200824.vcf'
# Chromosome file
chr_file = 'hg38_full.txt'
# Output file
output_file = 'clinvar_20200824.bed'

#variants_data = allel.read_vcf(clinvar_file, fields='*')
variants_data = vcf.Reader(open(clinvar_file, 'r'))

seed(1)


# extracted info keys
# [
#     'AF_ESP', 
#     'AF_EXAC', 
#     'AF_TGP', 
#     'ALLELEID', 
#     'ALT', 
#     'CHROM', 
#     'CLNDISDB', 
#     'CLNDISDBINCL', 
#     'CLNDN', 
#     'CLNDNINCL', 
#     'CLNHGVS', 
#     'CLNREVSTAT', 
#     'CLNSIG', 
#     'CLNSIGCONF', 
#     'CLNSIGINCL', 
#     'CLNVC', 
#     'CLNVCSO', 
#     'CLNVI', 
#     'DBVARID', 
#     'FILTER_PASS', 
#     'GENEINFO', 
#     'ID', 
#     'MC', 
#     'ORIGIN', 
#     'POS', 
#     'QUAL', 
#     'REF', 
#     'RS', 
#     'SSR', 
#     'altlen', 
#     'is_snp', 
#     'numalt']

gold_stars_allowed = [
    'criteria_provided,_multiple_submitters,_no_conflicts',
    'criteria_provided,_single_submitter',
    'criteria_provided,_conflicting_interpretations',
    'no_assertion_criteria_provided', 
    'reviewed_by_expert_panel', 
    'practice_guideline', 
    'no_interpretation_for_the_single_variant', 
    'no_assertion_provided'
]

significance_allowed = [
    'Benign',
    'Likely_benign',
    'Uncertain_significance',
    'Likely_pathogenic',
    'Pathogenic',
    'risk_factor',
    'Conflicting_interpretations_of_pathogenicity',
    'Benign/Likely_benign',
    'Pathogenic/Likely_pathogenic'
]

output = []
test = []

for record in variants_data:
    #print(record.INFO)
    if not 'CLNSIG' in record.INFO:
        continue

    if not 'CLNREVSTAT' in record.INFO:
        continue

    gold_stars_str = ','.join(record.INFO['CLNREVSTAT'])


    if not gold_stars_str in gold_stars_allowed:
        test.append(gold_stars_str)
        continue

    significance = record.INFO['CLNSIG'][0]
    if not significance in significance_allowed:
        #test.append(significance)
        continue

    gold_stars = 0
    if gold_stars_str == 'practice_guideline':
        gold_stars = 4
    elif gold_stars_str == 'reviewed_by_expert_panel':
        gold_stars = 3
    elif gold_stars_str == 'criteria_provided,_multiple_submitters,_no_conflicts':
        gold_stars = 2
    elif gold_stars_str in ['criteria_provided,_single_submitter', 'criteria_provided,_conflicting_interpretations']:
        gold_stars = 1

    disease_name = record.INFO['CLNDN'][0] if "CLNDN" in record.INFO else "."

    if disease_name == "not_provided":
        disease_name = "."

    if not record.CHROM in ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','X','Y']:
        continue

    #print(record)
    data_clean = {
        'chr': 'chr' + record.CHROM, 
        'start': +record.POS, 
        'end': +record.POS+1, 
        'ref': record.REF,
        'alt': record.ALT[0].sequence if record.ALT[0] else ".",
        'importance': gold_stars + random(),
        'gold_stars': gold_stars,
        'significance': significance,
        'significance_conf': ','.join(record.INFO['CLNSIGCONF']) if "CLNSIGCONF" in record.INFO else ".",
        'variant_type': record.INFO['CLNVC'] if "CLNVC" in record.INFO else ".",
        'origin': record.INFO['ORIGIN'][0] if "ORIGIN" in record.INFO else ".",
        'molecular_consequence': record.INFO['MC'][0] if "MC" in record.INFO else ".",
        'disease_name': disease_name,
        'hgvs': record.INFO['CLNHGVS'][0].replace("%3D", "=") if "CLNHGVS" in record.INFO else ".",
        #'database': record.INFO['CLNDISDB'][0] if "CLNDISDB" in record.INFO else ".",
        
        
    }

    output.append(data_clean)

myset = set(test)
print(myset)

print(output[0])
print(output[33])

headers = output[0].keys()
with open(output_file, 'w') as opf:
    myWriter = csv.DictWriter(opf, delimiter='\t', fieldnames=headers)
    for row in output:
        myWriter.writerow(row)

