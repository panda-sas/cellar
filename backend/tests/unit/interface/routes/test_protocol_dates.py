"""Protocol dates expose registration time, not the last metadata edit."""
import uuid
from datetime import UTC, datetime

from cellar.domain.screening_assay.enums import ProtocolType
from cellar.domain.screening_assay.protocol import Protocol
from cellar.interface.routes.protocols import ProtocolResponse


def test_protocol_response_preserves_creation_timestamp():
    created = datetime(2025, 3, 14, 9, 30, tzinfo=UTC)
    protocol = Protocol(
        workspace_id=uuid.uuid4(),
        name="Date provenance",
        protocol_type=ProtocolType.BIOCHEMICAL,
        created_by=uuid.uuid4(),
        created_at=created,
        updated_at=datetime(2026, 10, 10, tzinfo=UTC),
    )
    response = ProtocolResponse.from_domain(protocol)
    assert response.created_at == created
    assert response.model_dump(mode="json")["created_at"] == "2025-03-14T09:30:00Z"
