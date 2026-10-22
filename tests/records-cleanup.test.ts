import mongoose from "mongoose";
import { executeRecordsCleanup } from "../src/services/records-cleanup.service";
import { Task } from "../src/models/Task.model";
import { CaseDocument } from "../src/models/CaseDocument.model";
import { ClientDocument } from "../src/models/ClientDocument.model";
import { Case } from "../src/models/Case.model";
import { Hearing } from "../src/models/Hearing.model";
import { CaseEvent } from "../src/models/CaseEvent.model";
import { CaseExpense } from "../src/models/CaseExpense.model";
import { CaseParty } from "../src/models/CaseParty.model";
import { ClientPayment } from "../src/models/ClientPayment.model";
import { Client } from "../src/models/Client.model";
import { Court } from "../src/models/Court.model";
import { AssetReference } from "../src/models/AssetReference.model";
import { AuditLog } from "../src/models/AuditLog.model";

describe("Database Records Cleanup Service (executeRecordsCleanup)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should purge leaf entities (tasks, caseDocuments, clientDocuments) past retention", async () => {
    const expiredDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);

    const sampleTask = {
      _id: new mongoose.Types.ObjectId(),
      title: "Draft Writ Petition",
      deletedAt: expiredDate,
    };

    const sampleCaseDoc = {
      _id: new mongoose.Types.ObjectId(),
      caseId: new mongoose.Types.ObjectId(),
      title: "Petition Copy",
      deletedAt: expiredDate,
    };

    const sampleClientDoc = {
      _id: new mongoose.Types.ObjectId(),
      clientId: new mongoose.Types.ObjectId(),
      title: "National ID Card",
      deletedAt: expiredDate,
    };

    // Mock finds for leaf entities
    jest.spyOn(Task, "find").mockReturnValue({
      limit: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([sampleTask]),
      }),
    } as never);

    jest.spyOn(CaseDocument, "find").mockReturnValue({
      limit: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([sampleCaseDoc]),
      }),
    } as never);

    jest.spyOn(ClientDocument, "find").mockReturnValue({
      limit: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([sampleClientDoc]),
      }),
    } as never);

    // Empty finds for aggregates
    jest.spyOn(Case, "find").mockReturnValue({
      limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    } as never);
    jest.spyOn(Client, "find").mockReturnValue({
      limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    } as never);
    jest.spyOn(Court, "find").mockReturnValue({
      limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    } as never);

    // Mock deletions
    jest.spyOn(Task, "findOneAndDelete").mockResolvedValue(sampleTask as never);
    jest.spyOn(CaseDocument, "findOneAndDelete").mockResolvedValue(sampleCaseDoc as never);
    jest.spyOn(ClientDocument, "findOneAndDelete").mockResolvedValue(sampleClientDoc as never);
    jest.spyOn(AuditLog.prototype, "save").mockResolvedValue({} as never);

    const response = await executeRecordsCleanup(50);

    expect(response.success).toBe(true);
    expect(response.counts.tasks.deleted).toBe(1);
    expect(response.counts.caseDocuments.deleted).toBe(1);
    expect(response.counts.clientDocuments.deleted).toBe(1);
    expect(response.totalDeleted).toBe(3);
  });

  it("should guard Case deletion if remaining documents or active tasks exist", async () => {
    const caseId = new mongoose.Types.ObjectId();
    const candidateCase = {
      _id: caseId,
      title: "State vs Rahman",
      internalReference: "CR-2024-001",
      deletedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
    };

    // Leaf entities empty
    jest.spyOn(Task, "find").mockReturnValue({
      limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    } as never);
    jest.spyOn(CaseDocument, "find").mockReturnValue({
      limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    } as never);
    jest.spyOn(ClientDocument, "find").mockReturnValue({
      limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    } as never);
    jest.spyOn(Client, "find").mockReturnValue({
      limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    } as never);
    jest.spyOn(Court, "find").mockReturnValue({
      limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    } as never);

    // Case candidate present
    jest.spyOn(Case, "find").mockReturnValue({
      limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([candidateCase]) }),
    } as never);

    // Guard fails: active case document exists
    jest.spyOn(CaseDocument, "countDocuments").mockResolvedValue(1 as never);
    jest.spyOn(Task, "countDocuments").mockResolvedValue(0 as never);

    const deleteSpy = jest.spyOn(Case, "deleteOne");

    const response = await executeRecordsCleanup(50);

    expect(response.counts.cases.scanned).toBe(1);
    expect(response.counts.cases.eligible).toBe(0);
    expect(response.counts.cases.skipped).toBe(1);
    expect(response.counts.cases.deleted).toBe(0);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it("should cascade delete tightly coupled records when Case is eligible", async () => {
    const caseId = new mongoose.Types.ObjectId();
    const candidateCase = {
      _id: caseId,
      title: "State vs Rahman",
      internalReference: "CR-2024-001",
      deletedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
    };

    // Leaf entities empty
    jest.spyOn(Task, "find").mockReturnValue({
      limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    } as never);
    jest.spyOn(CaseDocument, "find").mockReturnValue({
      limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    } as never);
    jest.spyOn(ClientDocument, "find").mockReturnValue({
      limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    } as never);
    jest.spyOn(Client, "find").mockReturnValue({
      limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    } as never);
    jest.spyOn(Court, "find").mockReturnValue({
      limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    } as never);

    // Case candidate present
    jest.spyOn(Case, "find").mockReturnValue({
      limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([candidateCase]) }),
    } as never);

    // Guards pass: 0 remaining documents, 0 active tasks
    jest.spyOn(CaseDocument, "countDocuments").mockResolvedValue(0 as never);
    jest.spyOn(Task, "countDocuments").mockResolvedValue(0 as never);

    jest.spyOn(Case, "findOne").mockReturnValue({
      session: jest.fn().mockResolvedValue(candidateCase),
    } as never);

    const hearingDeleteSpy = jest.spyOn(Hearing, "deleteMany").mockResolvedValue({} as never);
    const eventDeleteSpy = jest.spyOn(CaseEvent, "deleteMany").mockResolvedValue({} as never);
    const expenseDeleteSpy = jest.spyOn(CaseExpense, "deleteMany").mockResolvedValue({} as never);
    const partyDeleteSpy = jest.spyOn(CaseParty, "deleteMany").mockResolvedValue({} as never);
    const paymentUpdateSpy = jest.spyOn(ClientPayment, "updateMany").mockResolvedValue({} as never);
    const taskUpdateSpy = jest.spyOn(Task, "updateMany").mockResolvedValue({} as never);
    const assetRefUpdateSpy = jest.spyOn(AssetReference, "updateMany").mockResolvedValue({} as never);
    const caseDeleteSpy = jest.spyOn(Case, "deleteOne").mockResolvedValue({} as never);
    jest.spyOn(AuditLog.prototype, "save").mockResolvedValue({} as never);

    const response = await executeRecordsCleanup(50);

    expect(response.counts.cases.deleted).toBe(1);
    expect(hearingDeleteSpy).toHaveBeenCalledWith({ caseId }, expect.anything());
    expect(eventDeleteSpy).toHaveBeenCalledWith({ caseId }, expect.anything());
    expect(expenseDeleteSpy).toHaveBeenCalledWith({ caseId }, expect.anything());
    expect(partyDeleteSpy).toHaveBeenCalledWith({ caseId }, expect.anything());
    expect(paymentUpdateSpy).toHaveBeenCalledWith(
      { caseId },
      { $set: { caseId: null } },
      expect.anything()
    );
    expect(taskUpdateSpy).toHaveBeenCalledWith(
      { caseId },
      { $set: { caseId: null } },
      expect.anything()
    );
    expect(assetRefUpdateSpy).toHaveBeenCalled();
    expect(caseDeleteSpy).toHaveBeenCalledWith({ _id: caseId }, expect.anything());
  });
});
