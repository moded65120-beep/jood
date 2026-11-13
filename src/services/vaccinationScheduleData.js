export const vaccinationStages = [
  {
    "id": "birth",
    "months": 0,
    "doses": [
      {
        "id": "bcg",
        "vaccineId": "BCG",
        "kind": "administration"
      }
    ]
  },
  {
    "id": "month2",
    "months": 2,
    "doses": [
      {
        "id": "combo1",
        "vaccineId": "HEXA",
        "number": 1,
        "kind": "administration"
      },
      {
        "id": "rota1",
        "vaccineId": "ROTA",
        "number": 1,
        "kind": "administration"
      }
    ]
  },
  {
    "id": "month3",
    "months": 3,
    "doses": [
      {
        "id": "combo2",
        "vaccineId": "HEXA",
        "number": 2,
        "kind": "administration"
      },
      {
        "id": "rota2",
        "vaccineId": "ROTA",
        "number": 2,
        "kind": "administration"
      },
      {
        "id": "opv3",
        "vaccineId": "OPV",
        "number": 1,
        "kind": "administration"
      }
    ]
  },
  {
    "id": "month4",
    "months": 4,
    "doses": [
      {
        "id": "combo3",
        "vaccineId": "HEXA",
        "number": 3,
        "kind": "administration"
      },
      {
        "id": "rota3",
        "vaccineId": "ROTA",
        "number": 3,
        "kind": "administration"
      },
      {
        "id": "opv4",
        "vaccineId": "OPV",
        "number": 2,
        "kind": "administration"
      }
    ]
  },
  {
    "id": "month9",
    "months": 9,
    "doses": [
      {
        "id": "measles",
        "vaccineId": "measles",
        "kind": "administration"
      },
      {
        "id": "opv9",
        "vaccineId": "OPV",
        "number": 3,
        "kind": "administration"
      },
      {
        "id": "vitaminA100",
        "vaccineId": "vitaminA",
        "kind": "preventive-service",
        "amount": 100000
      }
    ]
  },
  {
    "id": "month12",
    "months": 12,
    "doses": [
      {
        "id": "mmr1",
        "vaccineId": "MMR",
        "number": 1,
        "kind": "administration"
      }
    ]
  },
  {
    "id": "month18",
    "months": 18,
    "doses": [
      {
        "id": "mmr2",
        "vaccineId": "MMR",
        "number": 2,
        "kind": "administration"
      },
      {
        "id": "opv18",
        "vaccineId": "OPV",
        "number": "booster",
        "kind": "administration"
      },
      {
        "id": "dpt18",
        "vaccineId": "DPT",
        "number": "booster",
        "kind": "administration"
      },
      {
        "id": "vitaminA200",
        "vaccineId": "vitaminA",
        "kind": "preventive-service",
        "amount": 200000
      }
    ]
  }
]
