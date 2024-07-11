import React, { useState } from 'react';
import { Button, Form, Container, Row, Col, Alert, Card } from 'react-bootstrap';

const CryptorC = () => {
    const [view, setView] = useState('encrypt');
    const [plaintext, setPlaintext] = useState('');
    const [password, setPassword] = useState('');
    const [encryptedData, setEncryptedData] = useState('');
    const [decryptedText, setDecryptedText] = useState('');
    const [decryptedFiles, setDecryptedFiles] = useState([]);
    const [captions, setCaptions] = useState([]);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [files, setFiles] = useState([]);

    const getKeyMaterial = async (password) => {
        const enc = new TextEncoder();
        return crypto.subtle.importKey(
            'raw',
            enc.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );
    };

    const getKey = async (keyMaterial, salt) => {
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
    };

    const arrayBufferToBase64 = (buffer) => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        bytes.forEach((b) => binary += String.fromCharCode(b));
        return window.btoa(binary);
    };

    const base64ToArrayBuffer = (base64) => {
        const binary = window.atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    };

    const handleEncrypt = async () => {
        try {
            const enc = new TextEncoder();
            const keyMaterial = await getKeyMaterial(password);
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const key = await getKey(keyMaterial, salt);
            const iv = crypto.getRandomValues(new Uint8Array(12));

            // Combine plaintext, files, and captions into a single JSON object
            const combinedData = {
                text: plaintext,
                files: await Promise.all(files.map(async (file, index) => ({
                    name: file.name,
                    caption: captions[index],
                    data: await readFileAsDataURL(file)
                })))
            };

            const combinedDataStr = JSON.stringify(combinedData);
            const encrypted = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                enc.encode(combinedDataStr)
            );

            // Combine salt, iv, and encrypted data
            const combined = new Uint8Array(salt.length + iv.length + new Uint8Array(encrypted).length);
            combined.set(salt);
            combined.set(iv, salt.length);
            combined.set(new Uint8Array(encrypted), salt.length + iv.length);

            // Convert to base64
            setEncryptedData(arrayBufferToBase64(combined.buffer));
            setMessage({ type: 'success', text: 'Encryption successful!' });
        } catch (e) {
            console.error('Encryption error:', e);
            setMessage({ type: 'danger', text: 'Encryption failed. Please try again.' });
        }
    };

    const handleDecrypt = async () => {
        try {
            const combined = new Uint8Array(base64ToArrayBuffer(encryptedData));
            const salt = combined.slice(0, 16);
            const iv = combined.slice(16, 28);
            const encrypted = combined.slice(28);

            const keyMaterial = await getKeyMaterial(password);
            const key = await getKey(keyMaterial, salt);

            const decrypted = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                encrypted
            );

            const dec = new TextDecoder();
            const decryptedDataStr = dec.decode(decrypted);
            const decryptedDataObj = JSON.parse(decryptedDataStr);

            setDecryptedText(decryptedDataObj.text);
            setDecryptedFiles(decryptedDataObj.files);
            setMessage({ type: 'success', text: 'Decryption successful!' });
        } catch (e) {
            console.error('Decryption error:', e);
            setMessage({ type: 'danger', text: 'Decryption failed. Please check your data and password and try again.' });
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setMessage({ type: 'success', text: 'Copied to clipboard!' });
    };

    const handleFileChange = (e) => {
        setFiles(Array.from(e.target.files));
        // Clear previous captions when new files are uploaded
        setCaptions([]);
    };

    const handleCaptionChange = (index, e) => {
        const newCaptions = [...captions];
        newCaptions[index] = e.target.value;
        setCaptions(newCaptions);
    };

    const readFileAsDataURL = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const closeMessage = () => {
        setMessage({ type: '', text: '' });
    };

    const clearData = () => {
        setPlaintext('');
        setPassword('');
        setEncryptedData('');
        setDecryptedText('');
        setDecryptedFiles([]);
        setFiles([]);
        setCaptions([]);
        setMessage({ type: '', text: '' });
    };

    return (
        <>
            <Container className="mt-5" style={{ color: 'black' }}>
                <h1>Cryptor C</h1>
                <hr></hr>
                <Row className="mb-3">
                    <Col>
                        <Button variant={view === 'encrypt' ? 'success' : 'secondary'} onClick={() => setView('encrypt')} className="w-100">
                            Encrypt
                        </Button>
                      
                    </Col>
                    <Col>                       
                        <Button variant={view === 'decrypt' ? 'success' : 'secondary'} onClick={() => setView('decrypt')} className="w-100">
                            Decrypt
                        </Button>
                    </Col>
                </Row>
                <hr></hr>
                <Row className="mb-3"> 
                    <Col>
                        <Button variant="secondary" className="btn-sm w-100" onClick={clearData}>
                            Clear All
                        </Button>
                    </Col>
                </Row>
                <hr></hr>
                {message.text && (
                    <Row className="mb-3">
                        <Col>
                            <Alert variant={message.type} onClose={closeMessage}>
                                {message.text}
                            </Alert>
                        </Col>
                    </Row>
                )}
                {view === 'encrypt' && (
                    <Row>
                        <Col>
                            <Form>
                                <Form.Group controlId="plaintext">
                                    <Form.Label>Text to Encrypt</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={5}
                                        placeholder="Enter text to encrypt"
                                        value={plaintext}
                                        onChange={(e) => setPlaintext(e.target.value)}
                                    />
                                </Form.Group>
                                <hr></hr>
                                <Form.Group controlId="files">
                                    <Form.Label>Upload Files</Form.Label>
                                    <Form.Control
                                        type="file"
                                        multiple
                                        onChange={handleFileChange}
                                    />
                                    {files.map((file, index) => (
                                        <Row key={index} className="mt-3">
                                            <Col>
                                                <Form.Label>{file.name}</Form.Label>
                                            </Col>
                                            <Col>
                                               <Form.Control
                                                    type="text"
                                                    placeholder="Enter caption"
                                                    value={captions[index] || ''}
                                                    onChange={(e) => handleCaptionChange(index, e)}
                                                />
                                            </Col>
                                        </Row>
                                    ))}
                                </Form.Group>
                                <hr></hr>
                                <Form.Group controlId="password">
                                    <Form.Label>Password</Form.Label>
                                    <Form.Control
                                        type="password"
                                        placeholder="Enter password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </Form.Group>
                                <hr></hr>
                                <Button variant="primary" className="mt-2  w-100" onClick={handleEncrypt}>
                                    Encrypt
                                </Button>
                                <hr></hr>
                                <Form.Group controlId="encryptedData" className="mt-3">
                                    <Form.Label>Encrypted Data</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={5}
                                        placeholder="Encrypted data will appear here"
                                        value={encryptedData}
                                        readOnly
                                    />
                                    <Button variant="secondary" className="mt-2 mb-5 w-100" onClick={() => copyToClipboard(encryptedData)}>
                                        Copy
                                    </Button>
                                </Form.Group>
                            </Form>
                        </Col>
                    </Row>
                )}
                {view === 'decrypt' && (
                    <Row>
                        <Col>
                            <Form>
                                <Form.Group controlId="encryptedData">
                                    <Form.Label>Data to Decrypt</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={5}
                                        placeholder="Enter data to decrypt"
                                        value={encryptedData}
                                        onChange={(e) => setEncryptedData(e.target.value)}
                                    />
                                </Form.Group>
                                <hr></hr>
                                <Form.Group controlId="password">
                                    <Form.Label>Password</Form.Label>
                                    <Form.Control
                                        type="password"
                                        placeholder="Enter password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </Form.Group>
                                <hr></hr>
                                <Button variant="primary" onClick={handleDecrypt} className="mt-2 w-100">
                                    Decrypt
                                </Button>
                                {decryptedText && (
                                    <Form.Group controlId="decryptedData" className="mt-3">
                                        <Form.Label>Decrypted Text</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={5}
                                            placeholder="Decrypted text will appear here"
                                            value={decryptedText}
                                            readOnly
                                        />
                                    </Form.Group>
                                )}
                                {decryptedFiles.map((file, index) => (
                                    <Card key={index} className="mt-3">
                                        <Card.Header>{file.name}</Card.Header>
                                        <Card.Body>
                                            <Card.Text>
                                                Caption: {captions[index]}
                                                <br />
                                                {file.data.startsWith('data:image') ? (
                                                    <div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Button variant="primary" href={file.data} download>
                                                                Download
                                                            </Button>
                                                        </div>
                                                        <Card.Img src={file.data} style={{ width: '60%', marginTop: '10px' }} />
                                                    </div>
                                                ) : (
                                                    <Button variant="primary" className="mt-3" href={file.data} download>
                                                        Download
                                                    </Button>
                                                )}
                                            </Card.Text>
                                        </Card.Body>
                                    </Card>
                                ))}


                            </Form>
                        </Col>
                    </Row>
                )}
            </Container>
        </>
    );
};

export default CryptorC;
