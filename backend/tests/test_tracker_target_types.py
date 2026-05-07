# Copyright (c) 2026 Efstratios Goudelis

from handlers.entities.tracking import _missing_new_tracker_fields, _normalize_target_update_payload
from tracker.righandler import RigHandler


def test_normalize_mission_target_payload_forces_rotator_only_rig_state():
    result = _normalize_target_update_payload(
        {
            "target_type": "mission",
            "command": "ISS",
            "norad_id": 25544,
            "group_id": "group-1",
            "rig_state": "tracking",
            "transmitter_id": "tx-1",
        }
    )

    assert result["success"] is True
    value = result["value"]
    assert value["target_type"] == "mission"
    assert value["command"] == "ISS"
    assert value["norad_id"] is None
    assert value["group_id"] is None
    assert value["transmitter_id"] == "none"
    assert value["rig_state"] == "stopped"


def test_missing_new_tracker_fields_for_mission_target():
    missing = _missing_new_tracker_fields(
        {
            "target_type": "mission",
            "command": "Voyager 1",
            "rotator_state": "tracking",
            "rig_state": "stopped",
            "rig_id": "none",
            "rotator_id": "rot-1",
        }
    )

    assert missing == []


def test_missing_new_tracker_fields_for_body_target():
    missing = _missing_new_tracker_fields(
        {
            "target_type": "body",
            "body_id": "mars",
            "rotator_state": "tracking",
            "rig_state": "stopped",
            "rig_id": "none",
            "rotator_id": "rot-1",
        }
    )

    assert missing == []


def test_rig_handler_idle_for_non_satellite_target_resets_doppler_fields():
    tracker = type(
        "TrackerStub",
        (),
        {
            "rig_data": {
                "transmitter_id": "tx-1",
                "original_freq": 145800000,
                "downlink_observed_freq": 145801234,
                "doppler_shift": 1234,
                "uplink_freq": 435000000,
                "uplink_observed_freq": 434998765,
                "uplink_doppler_shift": -1235,
                "transmitters": [{"id": "tx-1"}],
                "tracking": True,
                "tuning": True,
                "stopped": False,
            }
        },
    )()
    handler = RigHandler(tracker)

    handler.apply_non_satellite_target_idle()

    assert tracker.rig_data["transmitter_id"] == "none"
    assert tracker.rig_data["downlink_observed_freq"] == 0
    assert tracker.rig_data["doppler_shift"] == 0
    assert tracker.rig_data["uplink_observed_freq"] == 0
    assert tracker.rig_data["uplink_doppler_shift"] == 0
    assert tracker.rig_data["transmitters"] == []
    assert tracker.rig_data["tracking"] is False
    assert tracker.rig_data["tuning"] is False
    assert tracker.rig_data["stopped"] is True
